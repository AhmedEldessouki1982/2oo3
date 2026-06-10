import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { CreateConversationDto } from './dto/create-conversation.dto'
import { UpdateConversationDto } from './dto/update-conversation.dto'

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateConversationDto) {
    const conversation = await this.prisma.conversation.create({
      data: {
        title: dto.title,
        contextSummary: dto.contextSummary ?? null,
        userId,
      },
    })
    return this.toSummary(conversation)
  }

  async findAll(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
    return conversations.map((c) => this.toSummary(c))
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
    status: string
    createdAt: Date
    updatedAt: Date
  }) {
    return {
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    }
  }

  private toDetail(conversation: {
    id: string
    title: string
    status: string
    createdAt: Date
    updatedAt: Date
    messages: Array<{
      id: string
      role: string
      content: string
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
      status: conversation.status,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((m) => ({
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
      })),
    }
  }
}
