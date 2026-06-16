import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'

import { AiOrchestrationModule } from './ai-orchestration/ai-orchestration.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { AttachmentsModule } from './attachments/attachments.module'
import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { CompareStreamModule } from './compare-stream/compare-stream.module'
import { ComparisonModule } from './comparison/comparison.module'
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware'
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware'
import { ConversationsModule } from './conversations/conversations.module'
import { HealthModule } from './health/health.module'
import { MessagesModule } from './messages/messages.module'
import { PrismaModule } from './prisma/prisma.module'
import { ProviderCredentialsModule } from './provider-credentials/provider-credentials.module'
import { ProvidersModule } from './providers/providers.module'
import { RoutinesModule } from './routines/routines.module'
import { StreamingModule } from './streaming/streaming.module'

@Module({
  controllers: [AppController],
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    AiOrchestrationModule,
    AnalyticsModule,
    ConversationsModule,
    MessagesModule,
      ProvidersModule,
      ComparisonModule,
      StreamingModule,
      CompareStreamModule,
    AttachmentsModule,
    ProviderCredentialsModule,
    RoutinesModule,
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, RequestLoggingMiddleware)
      .forRoutes('*')
  }
}
