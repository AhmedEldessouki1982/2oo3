import {
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AttachmentsService } from './attachments.service'

@ApiBearerAuth()
@ApiTags('Attachments')
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('conversations/:conversationId/attachments')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: Number(process.env.MAX_FILE_SIZE_BYTES) || 20 * 1024 * 1024,
          }),
          new FileTypeValidator({
            fileType:
              /(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|text\/csv|application\/json|image\/.*)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.attachmentsService.upload(userId, conversationId, file)
  }

  @Get('conversations/:conversationId/attachments')
  async list(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.attachmentsService.findByConversation(conversationId)
  }

  @Delete('attachments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.attachmentsService.deleteAttachment(userId, id)
  }
}
