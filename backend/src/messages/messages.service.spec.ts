import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { CompressionService } from '../compression/compression.service'
import { PrismaService } from '../prisma/prisma.service'
import { StreamEventService } from '../streaming/stream-event.service'
import { MessagesService } from './messages.service'

describe('MessagesService', () => {
  let service: MessagesService

  const mockPrisma = {
    conversation: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    providerCredential: {
      findMany: jest.fn(),
    },
    providerResponse: {
      create: jest.fn(),
    },
  }

  const mockStreamEvents = {
    emit: jest.fn(),
  }

  const mockCompression = {
    maybeCompress: jest.fn(),
  }

  const userId = 'user-1'
  const conversationId = 'conv-1'

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StreamEventService, useValue: mockStreamEvents },
        { provide: CompressionService, useValue: mockCompression },
      ],
    }).compile()

    service = module.get<MessagesService>(MessagesService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('sendMessage', () => {
    it('creates a message and provider responses', async () => {
      const now = new Date()
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: conversationId, userId })
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-1',
        role: 'USER',
        content: 'Hello world',
        createdAt: now,
        conversationId,
        userId,
      })
      mockPrisma.providerCredential.findMany.mockResolvedValue([])
      mockPrisma.providerResponse.create
        .mockResolvedValueOnce({ id: 'pr-1', provider: 'OPENAI', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'pr-2', provider: 'ANTHROPIC', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'pr-3', provider: 'GOOGLE', status: 'PENDING' })
      mockPrisma.message.count.mockResolvedValue(1) // first message → auto-title
      mockCompression.maybeCompress.mockResolvedValue(undefined)

      const result = await service.sendMessage(conversationId, userId, 'Hello world')

      expect(result.message.content).toBe('Hello world')
      expect(result.providerResponses).toHaveLength(3)
      expect(result.providerResponses[0].provider).toBe('OPENAI')
      expect(result.providerResponses[1].provider).toBe('ANTHROPIC')
      expect(result.providerResponses[2].provider).toBe('GOOGLE')

      // Auto-title triggered
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: { title: 'Hello world' },
      })

      // Compression triggered
      expect(mockCompression.maybeCompress).toHaveBeenCalledWith(conversationId)
    })

    it('uses enabled providers when credentials exist', async () => {
      const now = new Date()
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: conversationId, userId })
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-2',
        role: 'USER',
        content: 'Test',
        createdAt: now,
        conversationId,
        userId,
      })
      mockPrisma.providerCredential.findMany.mockResolvedValue([
        { provider: 'OPENAI', enabled: true },
      ])
      mockPrisma.providerResponse.create.mockResolvedValue({ id: 'pr-1', provider: 'OPENAI', status: 'PENDING' })
      mockPrisma.message.count.mockResolvedValue(2) // not first message
      mockCompression.maybeCompress.mockResolvedValue(undefined)

      const result = await service.sendMessage(conversationId, userId, 'Test')

      expect(result.providerResponses).toHaveLength(1)
      expect(result.providerResponses[0].provider).toBe('OPENAI')
    })

    it('throws NotFoundException when conversation not found', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null)

      await expect(
        service.sendMessage(conversationId, userId, 'Test'),
      ).rejects.toThrow(NotFoundException)
    })

    it('auto-titles with truncated content for long messages', async () => {
      const now = new Date()
      const longContent = 'A'.repeat(100)
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: conversationId, userId })
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-3',
        role: 'USER',
        content: longContent,
        createdAt: now,
        conversationId,
        userId,
      })
      mockPrisma.providerCredential.findMany.mockResolvedValue([])
      mockPrisma.providerResponse.create
        .mockResolvedValue({ id: 'pr-1', provider: 'OPENAI', status: 'PENDING' })
      mockPrisma.message.count.mockResolvedValue(1)

      await service.sendMessage(conversationId, userId, longContent)

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: { title: 'A'.repeat(57) + '...' },
      })
    })
  })

  describe('getMessages', () => {
    it('returns paginated messages in chronological order', async () => {
      const now = new Date()
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: conversationId, userId })
      mockPrisma.message.findMany.mockResolvedValue([
        {
          id: 'msg-2', role: 'ASSISTANT', content: 'Response', compressed: false, createdAt: new Date(now.getTime() + 1000),
          providerResponses: [{ id: 'pr-1', provider: 'OPENAI', status: 'COMPLETED', content: 'AI response', errorSummary: null, latencyMs: 500 }],
        },
        {
          id: 'msg-1', role: 'USER', content: 'Hello', compressed: false, createdAt: now,
          providerResponses: [],
        },
      ])
      mockPrisma.message.count.mockResolvedValue(2)

      const result = await service.getMessages(conversationId, userId, { page: 1, limit: 50 })

      // Should be reversed to chronological: msg-1 first, then msg-2
      expect(result.items).toHaveLength(2)
      expect(result.items[0].id).toBe('msg-1')
      expect(result.items[0].content).toBe('Hello')
      expect(result.items[1].id).toBe('msg-2')
      expect(result.items[1].providerResponses).toHaveLength(1)
      expect(result.total).toBe(2)
      expect(result.totalPages).toBe(1)
    })

    it('throws NotFoundException when conversation not found', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null)

      await expect(
        service.getMessages(conversationId, userId),
      ).rejects.toThrow(NotFoundException)
    })
  })
})
