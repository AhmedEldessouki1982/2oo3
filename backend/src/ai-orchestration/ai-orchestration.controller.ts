import {
  Body,
  Controller,
  HttpCode,
  Logger,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common'
import { Provider } from '@prisma/client'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { ComparisonService } from '../comparison/comparison.service'
import { PrismaService } from '../prisma/prisma.service'
import { ProviderOrchestratorService } from '../providers/provider-orchestrator.service'

interface ChatRequestDto {
  prompt: string
  history?: Array<{ role: string; content: string }>
  sessionId?: string
}

interface DocumentAnalysisDto {
  documentContent: string
  userQuestion: string
  fileName?: string
  sessionId?: string
}

@ApiBearerAuth()
@ApiTags('AI Orchestration')
@Controller('ai')
export class AiOrchestrationController {
  private readonly logger = new Logger(AiOrchestrationController.name)

  constructor(
    private readonly orchestrator: ProviderOrchestratorService,
    private readonly prisma: PrismaService,
    private readonly comparisonService: ComparisonService,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatRequestDto, @Req() req: any) {
    const userId = req.user?.sub ?? 'anonymous'

    const conversation = await this.prisma.conversation.create({
      data: {
        title: this.summarizePrompt(dto.prompt),
        type: 'CHAT',
        userId,
      },
    })

    const message = await this.prisma.message.create({
      data: {
        content: dto.prompt,
        role: 'USER',
        conversationId: conversation.id,
        userId,
      },
    })

    const enabledProviders = await this.prisma.providerCredential.findMany({
      where: { userId, enabled: true },
    })
    let providerNames =
      enabledProviders.length > 0
        ? enabledProviders.map((p) => p.provider)
        : (['OPENAI', 'ANTHROPIC', 'GOOGLE'] as const)

    const providerResponses = await Promise.all(
      providerNames.map((provider) =>
        this.prisma.providerResponse.create({
          data: {
            content: null,
            conversationId: conversation.id,
            messageId: message.id,
            provider: provider as Provider,
            status: 'PENDING',
          },
        }),
      ),
    )

    const dispatches = providerResponses.map((r) => ({
      providerResponseId: r.id,
      messageId: message.id,
      conversationId: conversation.id,
      userId,
      provider: r.provider,
      prompt: dto.prompt,
      conversationType: 'CHAT' as const,
    }))

    const responses = await this.orchestrator.dispatchAllSync(dispatches)

    this.comparisonService
      .generateComparison(message.id, conversation.id)
      .catch((err) => this.logger.error(`Comparison failed: ${err.message}`))

    return {
      sessionId: dto.sessionId ?? conversation.id,
      userPrompt: dto.prompt,
      timestamp: new Date(),
      responses: responses.map((r) => ({
        source: r.source.toLowerCase(),
        model: r.model,
        response: r.content,
        tokensUsed: r.tokens,
      })),
    }
  }

  @Post('analyze-document')
  @HttpCode(HttpStatus.OK)
  async analyzeDocument(@Body() dto: DocumentAnalysisDto, @Req() req: any) {
    const userId = req.user?.sub ?? 'anonymous'

    const conversation = await this.prisma.conversation.create({
      data: {
        title: `Document: ${dto.fileName ?? 'analysis'}`,
        type: 'COMMISSIONING',
        userId,
      },
    })

    const messageContent = `[Document Analysis]\n\nDocument: ${dto.fileName ?? 'uploaded file'}\nContent:\n${dto.documentContent.slice(0, 5000)}\n\nQuestion: ${dto.userQuestion}`
    const message = await this.prisma.message.create({
      data: {
        content: messageContent,
        role: 'USER',
        conversationId: conversation.id,
        userId,
      },
    })

    const enabledProviders = await this.prisma.providerCredential.findMany({
      where: { userId, enabled: true },
    })
    let providerNames =
      enabledProviders.length > 0
        ? enabledProviders.map((p) => p.provider)
        : (['OPENAI', 'ANTHROPIC', 'GOOGLE'] as const)

    const providerResponses = await Promise.all(
      providerNames.map((provider) =>
        this.prisma.providerResponse.create({
          data: {
            content: null,
            conversationId: conversation.id,
            messageId: message.id,
            provider: provider as Provider,
            status: 'PENDING',
          },
        }),
      ),
    )

    const dispatches = providerResponses.map((r) => ({
      providerResponseId: r.id,
      messageId: message.id,
      conversationId: conversation.id,
      userId,
      provider: r.provider,
      prompt: messageContent,
      conversationType: 'COMMISSIONING' as const,
    }))

    const responses = await this.orchestrator.dispatchAllSync(dispatches)

    return {
      sessionId: dto.sessionId ?? conversation.id,
      fileName: dto.fileName,
      userQuestion: dto.userQuestion,
      timestamp: new Date(),
      responses: responses.map((r) => ({
        source: r.source.toLowerCase(),
        model: r.model,
        analysis: r.content,
        tokensUsed: r.tokens,
      })),
    }
  }

  private summarizePrompt(prompt: string): string {
    return prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt
  }
}
