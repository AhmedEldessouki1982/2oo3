import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { PrismaService } from '../prisma/prisma.service'
import { ConversationsService } from './conversations.service'

describe('ConversationsService', () => {
  let service: ConversationsService

  const mockPrisma = {
    conversation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  }

  const userId = 'user-1'

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<ConversationsService>(ConversationsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('creates a conversation and returns a summary', async () => {
      const now = new Date()
      mockPrisma.conversation.create.mockResolvedValue({
        id: 'conv-1',
        title: 'Test conversation',
        type: 'COMMISSIONING',
        status: 'ACTIVE',
        lastCompressedAt: null,
        createdAt: now,
        updatedAt: now,
      })

      const result = await service.create(userId, {
        title: 'Test conversation',
        type: 'COMMISSIONING',
      })

      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: {
          title: 'Test conversation',
          type: 'COMMISSIONING',
          contextSummary: null,
          userId,
        },
      })
      expect(result).toEqual({
        id: 'conv-1',
        title: 'Test conversation',
        type: 'COMMISSIONING',
        status: 'ACTIVE',
        lastCompressedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
    })
  })

  describe('findAll', () => {
    it('returns paginated conversations', async () => {
      const now = new Date()
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 'conv-1', title: 'A', type: 'COMMISSIONING', status: 'ACTIVE', lastCompressedAt: null, createdAt: now, updatedAt: now },
        { id: 'conv-2', title: 'B', type: 'CHAT', status: 'ACTIVE', lastCompressedAt: null, createdAt: now, updatedAt: now },
      ])
      mockPrisma.conversation.count.mockResolvedValue(2)

      const result = await service.findAll(userId, { page: 1, limit: 20 })

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.totalPages).toBe(1)
    })

    it('filters by search query', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([])
      mockPrisma.conversation.count.mockResolvedValue(0)

      await service.findAll(userId, { search: 'vibration' })

      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            title: { contains: 'vibration', mode: 'insensitive' },
          },
        }),
      )
    })

    it('defaults to page 1 and limit 20', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([])
      mockPrisma.conversation.count.mockResolvedValue(0)

      await service.findAll(userId)

      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      )
    })
  })

  describe('findOne', () => {
    it('returns conversation with messages and attachments', async () => {
      const now = new Date()
      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        title: 'Test',
        type: 'COMMISSIONING',
        status: 'ACTIVE',
        contextSummary: null,
        lastCompressedAt: null,
        createdAt: now,
        updatedAt: now,
        messages: [
          {
            id: 'msg-1',
            role: 'USER',
            content: 'Hello',
            compressed: false,
            createdAt: now,
            providerResponses: [],
          },
        ],
        attachments: [],
      })

      const result = await service.findOne(userId, 'conv-1')

      expect(result.id).toBe('conv-1')
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].content).toBe('Hello')
      expect(result.attachments).toEqual([])
    })

    it('throws NotFoundException when not found', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null)

      await expect(service.findOne(userId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('update', () => {
    it('renames a conversation', async () => {
      const now = new Date()
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'conv-1', userId })
      mockPrisma.conversation.update.mockResolvedValue({
        id: 'conv-1',
        title: 'New title',
        type: 'COMMISSIONING',
        status: 'ACTIVE',
        lastCompressedAt: null,
        createdAt: now,
        updatedAt: now,
      })

      const result = await service.update(userId, 'conv-1', { title: 'New title' })

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { title: 'New title' },
      })
      expect(result.title).toBe('New title')
    })

    it('throws NotFoundException when not found', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null)

      await expect(
        service.update(userId, 'nonexistent', { title: 'New title' }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('deletes a conversation', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'conv-1', userId })
      mockPrisma.conversation.delete.mockResolvedValue({ id: 'conv-1' })

      await service.remove(userId, 'conv-1')

      expect(mockPrisma.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
      })
    })

    it('throws NotFoundException when not found', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null)

      await expect(service.remove(userId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
