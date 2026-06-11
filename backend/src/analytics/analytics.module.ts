import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'

@Module({
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
  imports: [PrismaModule],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
