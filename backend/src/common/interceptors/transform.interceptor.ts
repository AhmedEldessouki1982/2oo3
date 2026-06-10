import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface WrappedResponse<T> {
  data: T
  success: true
  timestamp: string
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, WrappedResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<WrappedResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        success: true as const,
        timestamp: new Date().toISOString(),
      })),
    ) as Observable<WrappedResponse<T>>
  }
}
