import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { CreateConversationDto } from './dto/create-conversation.dto'
import { ListConversationsQueryDto } from './dto/list-conversations-query.dto'
import { UpdateConversationDto } from './dto/update-conversation.dto'

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateConversationDto) {
    const conversation = await this.prisma.conversation.create({
      data: {
        title: dto.title,
        type: dto.type ?? 'COMMISSIONING',
        contextSummary: dto.contextSummary ?? null,
        userId,
      },
    })
    return this.toSummary(conversation)
  }

  async findAll(userId: string, query?: ListConversationsQueryDto) {
    const page = query?.page ?? 1
    const limit = query?.limit ?? 20
    const skip = (page - 1) * limit
    const search = query?.search?.trim()

    const where: Record<string, unknown> = { userId }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' }
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ])

    return {
      items: conversations.map((c) => this.toSummary(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findOne(userId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            providerResponses: {
              orderBy: { provider: 'asc' },
            },
          },
        },
      },
    })
    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }
    return this.toDetail(conversation)
  }

  async update(userId: string, id: string, dto: UpdateConversationDto) {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      throw new NotFoundException('Conversation not found')
    }
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { title: dto.title },
    })
    return this.toSummary(conversation)
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      throw new NotFoundException('Conversation not found')
    }
    await this.prisma.conversation.delete({ where: { id } })
  }

  private toSummary(conversation: {
    id: string
    title: string
    type: string
    status: string
    lastCompressedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }) {
    return {
      id: conversation.id,
      title: conversation.title,
      type: conversation.type,
      status: conversation.status,
      lastCompressedAt: conversation.lastCompressedAt?.toISOString() ?? null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    }
  }

  private toDetail(conversation: {
    id: string
    title: string
    type: string
    status: string
    contextSummary: string | null
    lastCompressedAt: Date | null
    createdAt: Date
    updatedAt: Date
    messages: Array<{
      id: string
      role: string
      content: string
      compressed: boolean
      createdAt: Date
      providerResponses: Array<{
        id: string
        provider: string
        status: string
        content: string | null
        errorSummary: string | null
        latencyMs: number | null
      }>
    }>
  }) {
    return {
      id: conversation.id,
      title: conversation.title,
      type: conversation.type,
      status: conversation.status,
      contextSummary: conversation.contextSummary,
      lastCompressedAt: conversation.lastCompressedAt?.toISOString() ?? null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((m) => ({
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
      })),
    }
  }
}
