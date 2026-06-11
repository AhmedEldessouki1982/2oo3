import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { ProviderCredentialsModule } from '../provider-credentials/provider-credentials.module'
import { PrismaModule } from '../prisma/prisma.module'
import { CompareStreamingController } from './streaming.controller'
import { CompareStreamingService } from './streaming.service'
import { LiveComparisonService } from './comparison.service'

@Module({
  controllers: [CompareStreamingController],
  imports: [
    PrismaModule,
    ProviderCredentialsModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod',
      }),
    }),
  ],
  providers: [CompareStreamingService, LiveComparisonService],
})
export class CompareStreamModule {}
