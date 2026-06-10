import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'

import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ComparisonModule } from './comparison/comparison.module'
import { ConversationsModule } from './conversations/conversations.module'
import { HealthModule } from './health/health.module'
import { MessagesModule } from './messages/messages.module'
import { PrismaModule } from './prisma/prisma.module'
import { ProvidersModule } from './providers/providers.module'
import { StreamingModule } from './streaming/streaming.module'

@Module({
  controllers: [AppController],
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    ConversationsModule,
    MessagesModule,
    ProvidersModule,
    ComparisonModule,
    StreamingModule,
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
