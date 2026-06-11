import { Test, type TestingModule } from '@nestjs/testing'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { PrismaService } from '../prisma/prisma.service'
import { AttachmentsService } from './attachments.service'

describe('AttachmentsService', () => {
  let service: AttachmentsService
  let prisma: PrismaService

  const mockPrisma = {
    attachment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<AttachmentsService>(AttachmentsService)
    prisma = module.get<PrismaService>(PrismaService)
    jest.clearAllMocks()
  })

  describe('upload', () => {
    it('saves file to disk and creates attachment record', async () => {
      const file = {
        originalname: 'test.csv',
        mimetype: 'text/csv',
        size: 100,
        buffer: Buffer.from('a,b,c\n1,2,3'),
      } as Express.Multer.File

      mockPrisma.attachment.create.mockResolvedValue({
        id: 'att-1',
        filename: 'test.csv',
        mimeType: 'text/csv',
        sizeBytes: 100,
        extractionStatus: 'PENDING',
        createdAt: new Date(),
      })
      mockPrisma.attachment.findUnique.mockResolvedValue({
        id: 'att-1',
        filename: 'test.csv',
        mimeType: 'text/csv',
        sizeBytes: 100,
        extractionStatus: 'COMPLETED',
        createdAt: new Date(),
      })
      mockPrisma.attachment.update.mockResolvedValue({})

      const result = await service.upload('user-1', 'conv-1', file)

      expect(result).not.toBeNull()
      expect(result!.filename).toBe('test.csv')
      expect(mockPrisma.attachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            conversationId: 'conv-1',
            filename: 'test.csv',
          }),
        }),
      )
    })

    it('handles text/csv extraction', async () => {
      const file = {
        originalname: 'data.csv',
        mimetype: 'text/csv',
        size: 50,
        buffer: Buffer.from('col1,col2\nval1,val2'),
      } as Express.Multer.File

      mockPrisma.attachment.create.mockResolvedValue({
        id: 'att-2',
        filename: 'data.csv',
        mimeType: 'text/csv',
        sizeBytes: 50,
        extractionStatus: 'PENDING',
        createdAt: new Date(),
      })
      mockPrisma.attachment.findUnique.mockResolvedValue({
        id: 'att-2',
        filename: 'data.csv',
        mimeType: 'text/csv',
        sizeBytes: 50,
        extractionStatus: 'COMPLETED',
        createdAt: new Date(),
      })
      mockPrisma.attachment.update.mockResolvedValue({})

      const result = await service.upload('user-1', 'conv-1', file)

      expect(result).not.toBeNull()
      expect(result!.filename).toBe('data.csv')
      expect(mockPrisma.attachment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            extractionStatus: 'PROCESSING',
          }),
        }),
      )
    })
  })

  describe('findByConversation', () => {
    it('returns attachments for a conversation', async () => {
      mockPrisma.attachment.findMany.mockResolvedValue([
        { id: 'att-1', filename: 'doc.pdf', mimeType: 'application/pdf', sizeBytes: 1000, extractionStatus: 'COMPLETED', createdAt: new Date() },
      ])

      const result = await service.findByConversation('conv-1')

      expect(result).toHaveLength(1)
      expect(result[0].filename).toBe('doc.pdf')
      expect(mockPrisma.attachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: 'conv-1' },
        }),
      )
    })
  })

  describe('deleteAttachment', () => {
    it('deletes attachment record and file from disk', async () => {
      const storagePath = path.join(__dirname, '../../uploads/test-delete.txt')
      fs.writeFileSync(storagePath, 'test', 'utf-8')

      mockPrisma.attachment.findFirst.mockResolvedValue({
        id: 'att-1',
        userId: 'user-1',
        storageUri: storagePath,
      })
      mockPrisma.attachment.delete.mockResolvedValue({})

      await service.deleteAttachment('user-1', 'att-1')

      expect(fs.existsSync(storagePath)).toBe(false)
      expect(mockPrisma.attachment.delete).toHaveBeenCalledWith({
        where: { id: 'att-1' },
      })
    })

    it('throws NotFoundException when attachment not found', async () => {
      mockPrisma.attachment.findFirst.mockResolvedValue(null)

      await expect(service.deleteAttachment('user-1', 'att-404')).rejects.toThrow(
        'Attachment not found',
      )
    })
  })

  describe('getAttachmentContext', () => {
    it('returns concatenated distilled context', async () => {
      mockPrisma.attachment.findMany.mockResolvedValue([
        { distilledContext: 'File1: test content' },
        { distilledContext: 'File2: more content' },
      ])

      const result = await service.getAttachmentContext('conv-1')

      expect(result).toContain('File1: test content')
      expect(result).toContain('File2: more content')
    })

    it('returns empty string when no attachments', async () => {
      mockPrisma.attachment.findMany.mockResolvedValue([])

      const result = await service.getAttachmentContext('conv-1')

      expect(result).toBe('')
    })
  })

  describe('linkToMessage', () => {
    it('links attachments to a message', async () => {
      mockPrisma.attachment.updateMany.mockResolvedValue({ count: 2 })

      await service.linkToMessage(['att-1', 'att-2'], 'msg-1')

      expect(mockPrisma.attachment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['att-1', 'att-2'] }, messageId: null },
        data: { messageId: 'msg-1' },
      })
    })

    it('skips linking when no attachment ids provided', async () => {
      await service.linkToMessage([], 'msg-1')
      expect(mockPrisma.attachment.updateMany).not.toHaveBeenCalled()
    })
  })
})
