import { Controller, Logger, Param, Query, Sse } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { filter, map, Observable } from 'rxjs'

import { Public } from '../auth/decorators/public.decorator'
import { StreamEventService } from './stream-event.service'

@Public()
@Controller('conversations/:conversationId/stream')
export class StreamingController {
  private readonly logger = new Logger(StreamingController.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly streamEvents: StreamEventService,
  ) {}

  @Sse()
  stream(
    @Param('conversationId') conversationId: string,
    @Query('token') token: string,
  ): Observable<MessageEvent> {
    try {
      this.jwtService.verify(token)
    } catch {
      const errorStream = new Observable<MessageEvent>((subscriber) => {
        const event = new MessageEvent('error', {
          data: JSON.stringify({ error: 'Unauthorized' }),
        })
        subscriber.next(event as MessageEvent)
        subscriber.complete()
      })
      return errorStream
    }

    return this.streamEvents.events$.pipe(
      filter((event) => event.conversationId === conversationId),
      map((event) => JSON.stringify({
        providerResponseId: event.providerResponseId,
        messageId: event.messageId,
        provider: event.provider,
        chunk: event.chunk,
        done: event.done,
        error: event.error,
      })),
    ) as unknown as Observable<MessageEvent>
  }
}
