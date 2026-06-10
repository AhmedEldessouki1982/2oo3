import { Logger, ServiceUnavailableException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { HealthService } from './health.service'

describe('HealthService', () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('returns ok when the database responds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService
    const service = new HealthService(prisma)

    await expect(service.check()).resolves.toMatchObject({
      checks: {
        api: {
          status: 'ok',
        },
        database: {
          status: 'ok',
        },
      },
      status: 'ok',
    })
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it('returns service unavailable when the database fails', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue({ code: 'P1001' }),
    } as unknown as PrismaService
    const service = new HealthService(prisma)

    await expect(service.check()).rejects.toThrow(ServiceUnavailableException)

    try {
      await service.check()
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException)
      expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
        checks: {
          database: {
            error: {
              code: 'P1001',
              message: 'Database connectivity check failed',
            },
            status: 'error',
          },
        },
        status: 'degraded',
      })
    }
  })
})
