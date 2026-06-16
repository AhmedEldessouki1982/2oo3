import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Provider } from '@prisma/client'

import { CompressionService } from '../compression/compression.service'
import { PrismaService } from '../prisma/prisma.service'
import { StreamEventService } from '../streaming/stream-event.service'
import type { ListMessagesQueryDto } from './dto/list-messages-query.dto'

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly streamEvents: StreamEventService,
    private readonly compression: CompressionService,
  ) {}

  async sendMessage(conversationId: string, userId: string, content: string, geminiMode?: 'GEMINI' | 'BIG_PICKLE') {
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

    const fallbackProviders = geminiMode === 'BIG_PICKLE'
      ? (['OPENAI', 'ANTHROPIC', 'BIG_PICKLE'] as const)
      : (['OPENAI', 'ANTHROPIC', 'GOOGLE'] as const)

    let providerNames = enabledProviders.length > 0
      ? enabledProviders.map((p) => p.provider)
      : fallbackProviders

    if (geminiMode === 'BIG_PICKLE') {
      providerNames = providerNames.map((p) => p === 'GOOGLE' ? 'BIG_PICKLE' : p)
    } else {
      providerNames = providerNames.map((p) => p === 'BIG_PICKLE' ? 'GOOGLE' : p)
    }

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

    // Auto-title from first user message
    const userMessageCount = await this.prisma.message.count({
      where: { conversationId, role: 'USER' },
    })
    if (userMessageCount === 1) {
      const title = content.length > 60
        ? content.slice(0, 57).trimEnd() + '...'
        : content
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
      }).catch((err) => {
        this.logger.error(`Auto-title failed for ${conversationId}: ${err.message}`)
      })
    }

    // Trigger compression check asynchronously — never block message send
    this.compression.maybeCompress(conversationId).catch((err) => {
      this.logger.error(`Background compression failed for ${conversationId}: ${err.message}`)
    })

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

  async getMessages(conversationId: string, userId: string, query?: ListMessagesQueryDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    })
    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    const page = query?.page ?? 1
    const limit = query?.limit ?? 50
    const skip = (page - 1) * limit

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          providerResponses: {
            orderBy: { provider: 'asc' },
          },
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ])

    // Reverse to chronological order for display
    const items = messages.reverse().map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      compressed: m.compressed,
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

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
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
