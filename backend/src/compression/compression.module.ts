import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'

import { PrismaModule } from '../prisma/prisma.module'
import { CompressionController } from './compression.controller'
import { CompressionService } from './compression.service'

@Module({
  controllers: [CompressionController],
  exports: [CompressionService],
  imports: [PrismaModule, PassportModule],
  providers: [CompressionService],
})
export class CompressionModule {}
