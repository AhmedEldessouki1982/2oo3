import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ConversationsService } from './conversations.service'
import { CreateConversationDto } from './dto/create-conversation.dto'
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto'
import { UpdateConversationDto } from './dto/update-conversation.dto'

@ApiBearerAuth()
@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(userId, dto)
  }

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: ListConversationsQueryDto,
  ) {
    return this.conversationsService.findAll(userId, query)
  }

  @Get(':id')
  @ApiQuery({ name: 'messagesLimit', required: false, type: Number, example: 50 })
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Query('messagesLimit') messagesLimit?: string,
  ) {
    const parsed = messagesLimit ? Number(messagesLimit) : NaN
    const limit = !Number.isNaN(parsed) && parsed > 0 ? parsed : undefined
    return this.conversationsService.findOne(userId, id, limit)
  }

  @Patch(':id')
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(userId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.conversationsService.remove(userId, id)
  }
}
