import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module'
import { EncryptionService } from './encryption.service'
import { ProviderCredentialsController } from './provider-credentials.controller'
import { ProviderCredentialsService } from './provider-credentials.service'

@Module({
  controllers: [ProviderCredentialsController],
  imports: [PrismaModule],
  providers: [EncryptionService, ProviderCredentialsService],
  exports: [ProviderCredentialsService, EncryptionService],
})
export class ProviderCredentialsModule {}
