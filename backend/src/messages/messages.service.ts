import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Provider } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import { StreamEventService } from '../streaming/stream-event.service'

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly streamEvents: StreamEventService,
  ) {}

  async sendMessage(conversationId: string, userId: string, content: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    })
    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    const message = await this.prisma.message.create({
      data: {
        content,
        role: 'USER',
        conversationId,
        userId,
      },
    })

    const enabledProviders = await this.prisma.providerCredential.findMany({
      where: { userId, enabled: true },
    })

    const providerNames = enabledProviders.length > 0
      ? enabledProviders.map((p) => p.provider)
      : (['OPENAI', 'ANTHROPIC', 'GOOGLE'] as const)

    const providerResponses = await Promise.all(
      providerNames.map((provider) =>
        this.prisma.providerResponse.create({
          data: {
            content: null,
            conversationId,
            messageId: message.id,
            provider: provider as Provider,
            status: 'PENDING',
          },
        }),
      ),
    )

    return {
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
      providerResponses: providerResponses.map((r) => ({
        id: r.id,
        provider: r.provider,
        status: r.status,
      })),
    }
  }

  async getMessages(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    })
    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        providerResponses: {
          orderBy: { provider: 'asc' },
        },
      },
    })

    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      providerResponses: m.providerResponses.map((r) => ({
        id: r.id,
        provider: r.provider,
        status: r.status,
        content: r.content,
        errorSummary: r.errorSummary,
        latencyMs: r.latencyMs,
      })),
    }))
  }

  emitChunk(event: {
    conversationId: string
    messageId: string
    providerResponseId: string
    provider: string
    chunk: string
    done: boolean
    error?: string
  }) {
    this.streamEvents.emit(event)
  }
}
