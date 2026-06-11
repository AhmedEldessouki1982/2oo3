import { Module } from '@nestjs/common'

import { ComparisonModule } from '../comparison/comparison.module'
import { ProvidersModule } from '../providers/providers.module'
import { PrismaModule } from '../prisma/prisma.module'
import { AiOrchestrationController } from './ai-orchestration.controller'

@Module({
  controllers: [AiOrchestrationController],
  imports: [ProvidersModule, PrismaModule, ComparisonModule],
})
export class AiOrchestrationModule {}
