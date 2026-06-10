import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module'
import { ComparisonController } from './comparison.controller'
import { ComparisonService } from './comparison.service'

@Module({
  controllers: [ComparisonController],
  exports: [ComparisonService],
  imports: [PrismaModule],
  providers: [ComparisonService],
})
export class ComparisonModule {}
