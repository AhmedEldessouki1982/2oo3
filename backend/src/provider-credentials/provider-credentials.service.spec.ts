import { Test, type TestingModule } from '@nestjs/testing'

import { PrismaService } from '../prisma/prisma.service'
import { EncryptionService } from './encryption.service'
import { ProviderCredentialsService } from './provider-credentials.service'

describe('EncryptionService', () => {
  let service: EncryptionService

  beforeAll(() => {
    process.env.PROVIDER_KEY_ENCRYPTION_SECRET = 'test-secret-key-for-unit-tests-min-16'
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile()
    service = module.get<EncryptionService>(EncryptionService)
  })

  it('encrypts and decrypts a string', () => {
    const plaintext = 'sk-test-api-key-12345'
    const encrypted = service.encrypt(plaintext)
    expect(encrypted).not.toBe(plaintext)
    expect(encrypted.split(':')).toHaveLength(3)
    const decrypted = service.decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertexts for same plaintext (IV-based)', () => {
    const plaintext = 'same-key-each-time'
    const a = service.encrypt(plaintext)
    const b = service.encrypt(plaintext)
    expect(a).not.toBe(b)
  })

  it('throws on invalid ciphertext format', () => {
    expect(() => service.decrypt('invalid')).toThrow('Invalid encrypted payload format')
  })
})

describe('ProviderCredentialsService', () => {
  let service: ProviderCredentialsService

  const mockPrisma = {
    providerCredential: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }

  beforeAll(() => {
    process.env.PROVIDER_KEY_ENCRYPTION_SECRET = 'test-secret-for-provider-creds-16c'
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderCredentialsService,
        EncryptionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<ProviderCredentialsService>(ProviderCredentialsService)
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('creates a new credential', async () => {
      mockPrisma.providerCredential.findUnique.mockResolvedValue(null)
      mockPrisma.providerCredential.create.mockResolvedValue({
        id: 'cred-1',
        provider: 'OPENAI',
        enabled: true,
        keyFingerprint: 'abc123',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockPrisma.auditLog.create.mockResolvedValue({})

      const result = await service.create('user-1', 'OPENAI', 'sk-test-123')

      expect(result.provider).toBe('OPENAI')
      expect(result.enabled).toBe(true)
      expect(mockPrisma.providerCredential.create).toHaveBeenCalled()
    })

    it('throws ConflictException when credential exists', async () => {
      mockPrisma.providerCredential.findUnique.mockResolvedValue({
        id: 'existing',
        provider: 'OPENAI',
      } as { id: string; provider: string })

      await expect(service.create('user-1', 'OPENAI', 'sk-test')).rejects.toThrow(
        'already exists',
      )
    })
  })

  describe('findAll', () => {
    it('returns all credentials for a user', async () => {
      mockPrisma.providerCredential.findMany.mockResolvedValue([
        { id: 'c1', provider: 'ANTHROPIC', enabled: true, keyFingerprint: 'fp1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'c2', provider: 'OPENAI', enabled: false, keyFingerprint: 'fp2', createdAt: new Date(), updatedAt: new Date() },
      ])

      const result = await service.findAll('user-1')

      expect(result).toHaveLength(2)
      expect(result[0].provider).toBe('ANTHROPIC')
    })
  })

  describe('toggle', () => {
    it('toggles enabled status', async () => {
      mockPrisma.providerCredential.findFirst.mockResolvedValue({
        id: 'cred-1',
        provider: 'OPENAI',
        enabled: true,
      })
      mockPrisma.providerCredential.update.mockResolvedValue({
        id: 'cred-1',
        provider: 'OPENAI',
        enabled: false,
        keyFingerprint: 'fp',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockPrisma.auditLog.create.mockResolvedValue({})

      const result = await service.toggle('user-1', 'OPENAI')

      expect(result.enabled).toBe(false)
    })

    it('throws NotFoundException when not found', async () => {
      mockPrisma.providerCredential.findFirst.mockResolvedValue(null)

      await expect(service.toggle('user-1', 'OPENAI')).rejects.toThrow(
        'not found',
      )
    })
  })

  describe('remove', () => {
    it('deletes a credential', async () => {
      mockPrisma.providerCredential.findFirst.mockResolvedValue({
        id: 'cred-1',
        provider: 'OPENAI',
      })
      mockPrisma.providerCredential.delete.mockResolvedValue({} as { id: string })
      mockPrisma.auditLog.create.mockResolvedValue({})

      await service.remove('user-1', 'OPENAI')
      expect(mockPrisma.providerCredential.delete).toHaveBeenCalled()
    })
  })
})
