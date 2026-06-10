import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { AttachmentsService } from '../attachments/attachments.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ProviderOrchestratorService } from '../providers/provider-orchestrator.service'
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

    const dispatches = result.providerResponses.map((r) => ({
      providerResponseId: r.id,
      messageId: result.message.id,
      conversationId,
      userId,
      provider: r.provider,
      prompt: dto.content,
    }))

    this.orchestrator.dispatchAll(dispatches)

    return result
  }

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagesService.getMessages(conversationId, userId)
  }
}
