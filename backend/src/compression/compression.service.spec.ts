import { Test, type TestingModule } from '@nestjs/testing'
import { PrismaClient } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import { CompressionService } from './compression.service'

describe('CompressionService', () => {
  let service: CompressionService
  let prisma: PrismaClient

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompressionService, PrismaService],
    }).compile()

    service = module.get<CompressionService>(CompressionService)
    prisma = module.get(PrismaService)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('generateSummary', () => {
    it('should return empty string for empty input', () => {
      const result = (service as unknown as { generateSummary: (entries: Array<{ role: string; content: string }>) => string }).generateSummary([])
      expect(result).toBe('')
    })

    it('should preserve equipment identifiers', () => {
      const entries = [
        { role: 'USER', content: 'What is the startup sequence for GT-1?' },
        { role: 'ASSISTANT', content: 'GT-1 requires HRSG steam blow to be complete before first fire.' },
      ]
      const result = (service as unknown as { generateSummary: (entries: Array<{ role: string; content: string }>) => string }).generateSummary(entries)
      expect(result).toContain('GT-1')
    })

    it('should preserve risk keywords', () => {
      const entries = [
        { role: 'USER', content: 'What are the risks of proceeding without steam blow completion?' },
        { role: 'ASSISTANT', content: 'Critical risk of tube overheating and permanent damage to the HRSG.' },
      ]
      const result = (service as unknown as { generateSummary: (entries: Array<{ role: string; content: string }>) => string }).generateSummary(entries)
      expect(result).toContain('Critical')
      expect(result).toContain('risk')
    })

    it('should preserve attachment references', () => {
      const entries = [
        { role: 'USER', content: 'Please review the attached PDF: OEM manual section 4.2' },
        { role: 'ASSISTANT', content: 'Based on Attachment: OEM_GT1_Startup.pdf, the purge cycle must run for 5 minutes.' },
      ]
      const result = (service as unknown as { generateSummary: (entries: Array<{ role: string; content: string }>) => string }).generateSummary(entries)
      expect(result).toContain('Attachment')
    })

    it('should preserve key technical content', () => {
      const entries = [
        { role: 'USER', content: 'The GT-1 purge cycle must run for 5 minutes before first fire per OEM manual.' },
      ]
      const result = (service as unknown as { generateSummary: (entries: Array<{ role: string; content: string }>) => string }).generateSummary(entries)
      expect(result).toContain('GT-1')
      expect(result).toContain('purge')
    })
  })

  describe('rollback', () => {
    it('should throw when conversation does not exist', async () => {
      await expect(service.rollback('nonexistent-id')).rejects.toThrow()
    })
  })
})
