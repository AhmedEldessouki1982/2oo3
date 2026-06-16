import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { AttachmentsService } from '../attachments/attachments.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { PrismaService } from '../prisma/prisma.service'
import { ProviderOrchestratorService } from '../providers/provider-orchestrator.service'
import { ListMessagesQueryDto } from './dto/list-messages-query.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { MessagesService } from './messages.service'

@ApiBearerAuth()
@ApiTags('Messages')
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly orchestrator: ProviderOrchestratorService,
    private readonly attachmentsService: AttachmentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async send(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    const promptContent = dto.content?.trim() || (dto.attachmentIds?.length
      ? 'Analyze the attached document(s) and provide a detailed summary of findings, risks, and recommendations relevant to this commissioning investigation.'
      : '')

    const result = await this.messagesService.sendMessage(
      conversationId,
      userId,
      promptContent,
      dto.geminiMode,
    )

    if (dto.attachmentIds?.length) {
      await this.attachmentsService.linkToMessage(dto.attachmentIds, result.message.id)
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true },
    })

    const dispatches = result.providerResponses.map((r) => ({
      providerResponseId: r.id,
      messageId: result.message.id,
      conversationId,
      userId,
      provider: r.provider,
      prompt: promptContent,
      conversationType: (conversation?.type ?? 'COMMISSIONING') as 'COMMISSIONING' | 'CHAT',
    }))

    this.orchestrator.dispatchAll(dispatches)

    return result
  }

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.messagesService.getMessages(conversationId, userId, query)
  }
}
