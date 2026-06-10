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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

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
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.conversationsService.findOne(userId, id)
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
