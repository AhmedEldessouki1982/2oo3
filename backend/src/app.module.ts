import { Module } from '@nestjs/common'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { HealthModule } from './health/health.module'

@Module({
  controllers: [AppController],
  imports: [HealthModule],
  providers: [AppService],
})
export class AppModule {}
