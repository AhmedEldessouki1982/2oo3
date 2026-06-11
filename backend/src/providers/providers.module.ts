import { Module } from '@nestjs/common'

import { AttachmentsModule } from '../attachments/attachments.module'
import { ComparisonModule } from '../comparison/comparison.module'
import { ProviderCredentialsModule } from '../provider-credentials/provider-credentials.module'
import { StreamingModule } from '../streaming/streaming.module'
import { ProviderOrchestratorService } from './provider-orchestrator.service'
import { WebSearchService } from './web-search.service'

@Module({
  exports: [ProviderOrchestratorService],
  imports: [AttachmentsModule, ComparisonModule, StreamingModule, ProviderCredentialsModule],
  providers: [ProviderOrchestratorService, WebSearchService],
})
export class ProvidersModule {}
