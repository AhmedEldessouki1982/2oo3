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
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { CreateRoutineDto } from './dto/create-routine.dto'
import { UpdateRoutineDto } from './dto/update-routine.dto'
import { RoutinesService } from './routines.service'

@ApiBearerAuth()
@ApiTags('Routines')
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRoutineDto,
  ) {
    return this.routinesService.create(userId, dto)
  }

  @Get()
  findAll(@CurrentUser('sub') userId: string) {
    return this.routinesService.findAll(userId)
  }

  @Get(':id')
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.routinesService.findOne(userId, id)
  }

  @Patch(':id')
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    return this.routinesService.update(userId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.routinesService.remove(userId, id)
  }
}
