import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { AttachmentsService } from '../attachments/attachments.service'
import { ComparisonService } from '../comparison/comparison.service'
import { ProviderCredentialsService } from '../provider-credentials/provider-credentials.service'
import { PrismaService } from '../prisma/prisma.service'
import { StreamEventService } from '../streaming/stream-event.service'
import { ProviderOrchestratorService } from './provider-orchestrator.service'
import { WebSearchService } from './web-search.service'

describe('ProviderOrchestratorService', () => {
  let service: ProviderOrchestratorService
  let errorSpy: jest.SpyInstance

  const mockPrisma = {
    message: {
      findMany: jest.fn(),
    },
    providerResponse: {
      update: jest.fn(),
    },
  }

  const mockStreamEvents = {
    emit: jest.fn(),
  }

  const mockComparisonService = {
    generateComparison: jest.fn(),
  }

  const mockAttachmentsService = {
    getAttachmentContext: jest.fn(),
  }

  const mockWebSearch = {
    search: jest.fn(),
  }

  const mockCredentialsService = {
    findDecrypted: jest.fn().mockResolvedValue(null),
  }

  const baseDispatch = {
    providerResponseId: 'pr-1',
    messageId: 'msg-1',
    conversationId: 'conv-1',
    userId: 'user-1',
    provider: 'OPENAI',
    prompt: 'Analyze this vibration data',
    conversationType: 'COMMISSIONING' as const,
  }

  beforeEach(async () => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()

    mockPrisma.message.findMany.mockResolvedValue([])
    mockPrisma.providerResponse.update.mockResolvedValue({})
    mockAttachmentsService.getAttachmentContext.mockResolvedValue('')
    mockWebSearch.search.mockResolvedValue({ query: '', results: [], summary: '' })
    mockComparisonService.generateComparison.mockResolvedValue({ id: 'cmp-1' })
    mockCredentialsService.findDecrypted.mockResolvedValue(null)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderOrchestratorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StreamEventService, useValue: mockStreamEvents },
        { provide: ComparisonService, useValue: mockComparisonService },
        { provide: AttachmentsService, useValue: mockAttachmentsService },
        { provide: ProviderCredentialsService, useValue: mockCredentialsService },
        { provide: WebSearchService, useValue: mockWebSearch },
      ],
    }).compile()

    service = module.get<ProviderOrchestratorService>(ProviderOrchestratorService)
  })

  afterEach(() => {
    jest.clearAllMocks()
    errorSpy.mockRestore()
  })

  describe('dispatchAll', () => {
    it('dispatches to all providers and triggers comparison', async () => {
      await service.dispatchAll([baseDispatch])

      expect(mockPrisma.providerResponse.update).toHaveBeenCalled()
      expect(mockComparisonService.generateComparison).toHaveBeenCalledWith(
        'msg-1',
        'conv-1',
      )
    })

    it('handles comparison failure gracefully', async () => {
      mockComparisonService.generateComparison.mockRejectedValue(
        new Error('Comparison error'),
      )

      await service.dispatchAll([baseDispatch])

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-comparison trigger failed'),
      )
    })

    it('handles provider failure gracefully', async () => {
      mockPrisma.providerResponse.update.mockRejectedValue(
        new Error('DB error'),
      )

      await service.dispatchAll([baseDispatch])

      // Should have caught the error and not thrown
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Provider OPENAI failed'),
      )
      // Should still attempt comparison
      expect(mockComparisonService.generateComparison).toHaveBeenCalled()
    })

    it('does nothing when dispatches array is empty', async () => {
      await service.dispatchAll([])

      expect(mockPrisma.providerResponse.update).not.toHaveBeenCalled()
      expect(mockComparisonService.generateComparison).not.toHaveBeenCalled()
    })
  })

  describe('dispatchAllSync', () => {
    it('returns AIResponse for each successful provider', async () => {
      mockPrisma.message.findMany.mockResolvedValue([])
      mockAttachmentsService.getAttachmentContext.mockResolvedValue('')
      mockPrisma.providerResponse.update.mockResolvedValue({})

      const responses = await service.dispatchAllSync([baseDispatch])

      expect(responses).toHaveLength(1)
      expect(responses[0].source).toBe('OPENAI')
      expect(responses[0].content).toBeTruthy()
      expect(responses[0].model).toBe('gpt-4-turbo')
      expect(responses[0].tokens).toBeGreaterThan(0)
    })

    it('skips failed providers gracefully', async () => {
      mockPrisma.providerResponse.update.mockRejectedValue(
        new Error('DB error'),
      )

      const responses = await service.dispatchAllSync([baseDispatch])

      expect(responses).toHaveLength(0)
    })

    it('returns responses only from successful providers', async () => {
      const dispatches = [
        { ...baseDispatch, provider: 'OPENAI', providerResponseId: 'pr-1' },
        { ...baseDispatch, provider: 'ANTHROPIC', providerResponseId: 'pr-2' },
        { ...baseDispatch, provider: 'GOOGLE', providerResponseId: 'pr-3' },
      ]

      mockPrisma.providerResponse.update
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Anthropic failed'))
        .mockResolvedValueOnce({})

      const responses = await service.dispatchAllSync(dispatches)

      expect(responses).toHaveLength(2)
      expect(responses[0].source).toBe('OPENAI')
      expect(responses[1].source).toBe('GOOGLE')
    })
  })
})
