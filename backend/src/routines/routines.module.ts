import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module'
import { ProviderCredentialsModule } from '../provider-credentials/provider-credentials.module'
import { ProvidersModule } from '../providers/providers.module'
import { RoutineSchedulerService } from './routine-scheduler.service'
import { RoutinesController } from './routines.controller'
import { RoutinesService } from './routines.service'

@Module({
  imports: [PrismaModule, ProvidersModule, ProviderCredentialsModule],
  controllers: [RoutinesController],
  providers: [RoutinesService, RoutineSchedulerService],
  exports: [RoutinesService],
})
export class RoutinesModule {}
