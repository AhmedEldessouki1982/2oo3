import { Injectable } from '@nestjs/common'
import { Subject } from 'rxjs'

export interface StreamChunkEvent {
  conversationId: string
  messageId: string
  providerResponseId: string
  provider: string
  chunk: string
  done: boolean
  error?: string
}

@Injectable()
export class StreamEventService {
  private readonly subject = new Subject<StreamChunkEvent>()

  get events$() {
    return this.subject.asObservable()
  }

  emit(event: StreamChunkEvent) {
    this.subject.next(event)
  }
}
