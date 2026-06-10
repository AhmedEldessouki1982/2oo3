import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { CompressionService } from './compression.service'

@ApiBearerAuth()
@ApiTags('Compression')
@UseGuards(AuthGuard('jwt'))
@Controller('conversations/:conversationId/compression')
export class CompressionController {
  private readonly logger = new Logger(CompressionController.name)

  constructor(private readonly compressionService: CompressionService) {}

  @Post('rollback')
  @HttpCode(HttpStatus.OK)
  async rollback(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    this.logger.debug(`Rollback requested for conversation ${conversationId} by user ${userId}`)
    await this.compressionService.rollback(conversationId)
    return { message: 'Compression rolled back successfully' }
  }
}
