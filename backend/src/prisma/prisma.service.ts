import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@prisma/client'

const defaultDatabaseUrl =
  'postgresql://postgres:postgres@localhost:5432/2oo3?schema=public'

type PrismaClientOptionsWithLog = Prisma.PrismaClientOptions & {
  log: Prisma.LogDefinition[]
}

@Injectable()
export class PrismaService
  extends PrismaClient<PrismaClientOptionsWithLog>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    const connectionString = process.env.DATABASE_URL ?? defaultDatabaseUrl
    const adapter = new PrismaPg({ connectionString })
    const log: Prisma.LogDefinition[] =
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ]
        : [
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ]

    super({ adapter, log })

    this.$on('warn', (event) => {
      this.logger.warn(event.message)
    })
    this.$on('error', (event) => {
      this.logger.error(event.message)
    })

    if (process.env.NODE_ENV === 'development') {
      this.$on('query', (event) => {
        this.logger.debug(`Prisma query completed in ${event.duration}ms`)
      })
    }
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Connected to PostgreSQL through Prisma')
  }

  async onModuleDestroy() {
    await this.$disconnect()
    this.logger.log('Disconnected from PostgreSQL')
  }
}
