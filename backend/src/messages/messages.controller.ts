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
    const result = await this.messagesService.sendMessage(
      conversationId,
      userId,
      dto.content,
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
      prompt: dto.content,
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
