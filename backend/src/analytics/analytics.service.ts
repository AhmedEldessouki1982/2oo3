import { Injectable, Logger } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface AnalyticsEvent {
  userId?: string
  event: string
  properties?: Record<string, unknown>
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async track(event: string, userId?: string, properties?: Record<string, unknown>) {
    try {
      const props = (properties ?? {}) as Prisma.InputJsonValue
      await this.prisma.analyticsEvent.create({
        data: {
          event,
          userId: userId ?? null,
          properties: props,
        },
      })
    } catch (error) {
      this.logger.error(
        `Failed to record analytics event "${event}": ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  async getEventCount(event: string, since?: Date): Promise<number> {
    return this.prisma.analyticsEvent.count({
      where: {
        event,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
    })
  }
}
