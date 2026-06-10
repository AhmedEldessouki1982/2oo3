import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, { data: T; success: true; timestamp: string }>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<{ data: T; success: true; timestamp: string }> {
    return next.handle().pipe(
      map((data) => ({
        data,
        success: true as const,
        timestamp: new Date().toISOString(),
      })),
    )
  }
}
