import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'

import { PrismaModule } from '../prisma/prisma.module'
import { AttachmentsController } from './attachments.controller'
import { AttachmentsService } from './attachments.service'

@Module({
  controllers: [AttachmentsController],
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  ],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
