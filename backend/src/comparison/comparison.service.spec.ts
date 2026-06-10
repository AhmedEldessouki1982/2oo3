import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { PrismaService } from '../prisma/prisma.service'
import { ComparisonService } from './comparison.service'

describe('ComparisonService', () => {
  let service: ComparisonService
  let debugSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  const mockPrisma = {
    providerResponse: {
      findMany: jest.fn(),
    },
    comparisonResult: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  }

  beforeEach(async () => {
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation()
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparisonService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<ComparisonService>(ComparisonService)
  })

  afterEach(() => {
    jest.clearAllMocks()
    debugSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe('generateComparison', () => {
    const messageId = 'msg-1'
    const conversationId = 'conv-1'

    it('returns null when fewer than 2 completed responses', async () => {
      mockPrisma.providerResponse.findMany.mockResolvedValue([
        { provider: 'OPENAI', content: 'Some content' },
      ])

      const result = await service.generateComparison(messageId, conversationId)

      expect(result).toBeNull()
      expect(mockPrisma.comparisonResult.upsert).not.toHaveBeenCalled()
    })

    it('persists comparison with agreements, disagreements, risks, and investigations', async () => {
      const openaiContent = `1. **Risk**: Proceeding without permissive checks is a critical safety hazard.
2. **Permissive**: All protection relays and permissive devices require complete validation.
3. **Check**: Hold first fire until loop checks complete.`
      const anthropicContent = `1. **Risk**: Unresolved punch list items remain open before commissioning.
2. **Permissive**: Protection relay validation is essential before proceeding.
3. **Check**: Review punch list before energization.`

      mockPrisma.providerResponse.findMany.mockResolvedValue([
        { provider: 'OPENAI', content: openaiContent },
        { provider: 'ANTHROPIC', content: anthropicContent },
      ])

      mockPrisma.comparisonResult.upsert.mockResolvedValue({
        id: 'cmp-1',
        status: 'COMPLETED',
        agreements: [],
        disagreements: [],
        uniqueInsights: [],
        risks: [],
        nextInvestigations: [],
      })

      const result = await service.generateComparison(messageId, conversationId)

      expect(mockPrisma.comparisonResult.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { messageId },
          create: expect.objectContaining({
            conversationId,
            status: 'COMPLETED',
          }),
        }),
      )

      const createData = mockPrisma.comparisonResult.upsert.mock.calls[0][0].create

      expect(createData.agreements).toBeDefined()
      expect(createData.disagreements).toBeDefined()
      expect(createData.risks).toBeDefined()
      expect(createData.nextInvestigations).toBeDefined()

      const disagreements = createData.disagreements as Array<{ title: string; findings: string[] }>
      expect(disagreements.length).toBeGreaterThanOrEqual(1)
      expect(disagreements[0].title).toMatch(/^Conflicting views on /)
      expect(disagreements[0].findings.length).toBeGreaterThanOrEqual(2)
      expect(disagreements[0].findings[0]).not.toEqual(disagreements[0].findings[1])

      const risks = createData.risks as Array<{ title: string; findings: string[]; severity?: string }>
      expect(risks.length).toBeGreaterThanOrEqual(1)
      expect(risks.some((r) => r.title.includes('OPENAI') || r.title.includes('ANTHROPIC'))).toBe(
        true,
      )

      const investigations = createData.nextInvestigations as Array<{ title: string; findings: string[] }>
      expect(investigations.length).toBeGreaterThanOrEqual(1)
      expect(investigations.some((i) => i.findings[0]?.includes('validation'))).toBe(true)

      expect(result).toBeDefined()
    })

    it('handles upsert failure gracefully', async () => {
      mockPrisma.providerResponse.findMany.mockResolvedValue([
        { provider: 'OPENAI', content: '1. Item one.' },
        { provider: 'ANTHROPIC', content: '1. Item two.' },
      ])
      mockPrisma.comparisonResult.upsert
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'cmp-fail', status: 'FAILED' })

      const result = await service.generateComparison(messageId, conversationId)

      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('DB error'),
      )
    })
  })

  describe('getComparison', () => {
    it('returns comparison for a message', async () => {
      mockPrisma.comparisonResult.findUnique.mockResolvedValue({
        id: 'cmp-1',
        status: 'COMPLETED',
        agreements: [],
        disagreements: [],
        uniqueInsights: [],
        risks: [],
        nextInvestigations: [],
        errorSummary: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.getComparison('msg-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('cmp-1')
      expect(mockPrisma.comparisonResult.findUnique).toHaveBeenCalledWith({
        where: { messageId: 'msg-1' },
        select: expect.objectContaining({
          agreements: true,
          risks: true,
        }),
      })
    })

    it('returns null when no comparison exists', async () => {
      mockPrisma.comparisonResult.findUnique.mockResolvedValue(null)

      const result = await service.getComparison('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('statement extraction', () => {
    it('extracts numbered statements from markdown content', () => {
      const content = `**Header**

1. **First item**: description here.
2. **Second item**: more details.

> blockquote text

- Bullet item`

      const statements = (service as unknown as { extractStatements: (c: string) => unknown[] }).extractStatements(content)

      expect(statements.length).toBe(3)
      expect(statements[0]).toEqual(
        expect.objectContaining({
          text: '**First item**: description here.',
        }),
      )
    })

    it('handles empty content', () => {
      const statements = (service as unknown as { extractStatements: (c: string) => unknown[] }).extractStatements('')
      expect(statements.length).toBe(0)
    })

    it('handles content with no numbered items', () => {
      const statements = (service as unknown as { extractStatements: (c: string) => unknown[] }).extractStatements('hi\n\nthere')
      expect(statements.length).toBe(0)
    })
  })
})
