import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { StreamEventService } from './stream-event.service'
import { StreamingController } from './streaming.controller'

@Module({
  controllers: [StreamingController],
  exports: [StreamEventService],
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod',
      }),
    }),
  ],
  providers: [StreamEventService],
})
export class StreamingModule {}
