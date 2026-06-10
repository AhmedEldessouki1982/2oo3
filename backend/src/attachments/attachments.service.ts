import { Injectable, Logger } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async upload(
    userId: string,
    conversationId: string,
    file: Express.Multer.File,
  ) {
    const attachment = await this.prisma.attachment.create({
      data: {
        userId,
        conversationId,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    })

    this.logger.debug(`Attachment saved: ${attachment.id} (${file.originalname})`)

    return attachment
  }

  async linkToMessage(attachmentIds: string[], messageId: string) {
    if (attachmentIds.length === 0) return

    await this.prisma.attachment.updateMany({
      where: { id: { in: attachmentIds }, messageId: null },
      data: { messageId },
    })

    this.logger.debug(`Linked ${attachmentIds.length} attachments to message ${messageId}`)
  }
}
