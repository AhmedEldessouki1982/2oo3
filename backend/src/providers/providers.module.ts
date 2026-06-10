import { Module } from '@nestjs/common'

import { ComparisonModule } from '../comparison/comparison.module'
import { StreamingModule } from '../streaming/streaming.module'
import { ProviderOrchestratorService } from './provider-orchestrator.service'

@Module({
  exports: [ProviderOrchestratorService],
  imports: [ComparisonModule, StreamingModule],
  providers: [ProviderOrchestratorService],
})
export class ProvidersModule {}
