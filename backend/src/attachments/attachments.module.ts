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
    MulterModule.registerAsync({
      useFactory: () => ({
        storage: memoryStorage(),
        limits: {
          fileSize: Number(process.env.MAX_FILE_SIZE_BYTES) || 20 * 1024 * 1024,
        },
      }),
    }),
  ],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
