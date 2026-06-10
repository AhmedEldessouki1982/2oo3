import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'

type ComponentStatus = 'ok' | 'error'

type HealthComponent = {
  status: ComponentStatus
  durationMs?: number
  error?: {
    code: string
    message: string
  }
}

type HealthStatus = {
  checks: {
    api: HealthComponent
    database: HealthComponent
  }
  durationMs: number
  status: 'ok' | 'degraded'
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name)

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const startedAt = Date.now()
    const databaseStartedAt = Date.now()

    try {
      await this.prisma.$queryRaw`SELECT 1`

      return {
        checks: {
          api: {
            status: 'ok',
          },
          database: {
            durationMs: Date.now() - databaseStartedAt,
            status: 'ok',
          },
        },
        durationMs: Date.now() - startedAt,
        status: 'ok',
      }
    } catch (error) {
      const databaseDurationMs = Date.now() - databaseStartedAt
      const code = this.getDatabaseErrorCode(error)

      this.logger.error(
        `Database health check failed after ${databaseDurationMs}ms (${code})`,
      )

      const response: HealthStatus = {
        checks: {
          api: {
            status: 'ok',
          },
          database: {
            durationMs: databaseDurationMs,
            error: {
              code,
              message: 'Database connectivity check failed',
            },
            status: 'error',
          },
        },
        durationMs: Date.now() - startedAt,
        status: 'degraded',
      }

      throw new ServiceUnavailableException(response)
    }
  }

  private getDatabaseErrorCode(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
    ) {
      return error.code
    }

    return 'DATABASE_UNAVAILABLE'
  }
}
