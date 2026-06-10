import { Module } from '@nestjs/common'

import { AttachmentsModule } from '../attachments/attachments.module'
import { CompressionModule } from '../compression/compression.module'
import { ProvidersModule } from '../providers/providers.module'
import { StreamingModule } from '../streaming/streaming.module'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'

@Module({
  controllers: [MessagesController],
  exports: [MessagesService],
  imports: [ProvidersModule, StreamingModule, AttachmentsModule, CompressionModule],
  providers: [MessagesService],
})
export class MessagesModule {}
