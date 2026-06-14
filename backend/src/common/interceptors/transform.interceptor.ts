import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Request } from 'express'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface WrappedResponse<T> {
  data: T
  success: true
  timestamp: string
  correlationId: string
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  WrappedResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<WrappedResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>()
    const correlationId = request.correlationId ?? 'unknown'
    return next.handle().pipe(
      map((data) => ({
        data,
        success: true as const,
        timestamp: new Date().toISOString(),
        correlationId,
      })),
    ) as Observable<WrappedResponse<T>>
  }
}
