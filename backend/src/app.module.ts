import { Module } from '@nestjs/common'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { HealthModule } from './health/health.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  controllers: [AppController],
  imports: [PrismaModule, HealthModule],
  providers: [AppService],
})
export class AppModule {}
