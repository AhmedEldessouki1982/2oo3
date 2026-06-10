import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'

import { PrismaService } from '../prisma/prisma.service'
import { AuthService } from './auth.service'

describe('AuthService', () => {
  let service: AuthService
  let prisma: {
    user: {
      findUnique: jest.Mock
      create: jest.Mock
    }
    refreshToken: {
      create: jest.Mock
      findFirst: jest.Mock
      update: jest.Mock
    }
  }
  let jwt: {
    sign: jest.Mock
    verify: jest.Mock
    decode: jest.Mock
  }

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'COMMISSIONING_ENGINEER',
    passwordHash: null as string | null,
    createdAt: new Date('2025-01-01'),
  }

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    }

    jwt = {
      sign: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  describe('register', () => {
    it('creates a user and returns tokens', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'SecurePass1!',
        displayName: 'New User',
      }

      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: dto.email,
        displayName: dto.displayName,
        passwordHash: 'hashed',
      })
      jwt.sign.mockReturnValue('mock-token')
      jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 86400 })
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' })

      const result = await service.register(dto)

      expect(result.user.email).toBe(dto.email)
      expect(result.accessToken).toBe('mock-token')
      expect(result.refreshToken).toBe('mock-token')
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            displayName: dto.displayName,
          }),
        }),
      )
    })

    it('throws ConflictException if email exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser)

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'SecurePass1!',
          displayName: 'Test',
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('login', () => {
    it('validates credentials and returns tokens', async () => {
      const hashed = await bcrypt.hash('ValidPass1!', 10)
      const user = { ...mockUser, passwordHash: hashed }

      prisma.user.findUnique.mockResolvedValue(user)
      jwt.sign.mockReturnValue('mock-token')
      jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 86400 })
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' })

      const result = await service.login({
        email: 'test@example.com',
        password: 'ValidPass1!',
      })

      expect(result.user.email).toBe('test@example.com')
      expect(result.accessToken).toBe('mock-token')
    })

    it('throws UnauthorizedException for bad password', async () => {
      const hashed = await bcrypt.hash('ValidPass1!', 10)
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: hashed,
      })

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPass1!',
        }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'AnyPass1!',
        }),
      ).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('refresh', () => {
    it('rotates refresh token', async () => {
      const payload = { sub: 'user-1', type: 'refresh' }
      jwt.verify.mockReturnValue(payload)
      jwt.sign.mockReturnValue('new-token')
      jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 86400 })
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        revoked: false,
      })
      prisma.refreshToken.update.mockResolvedValue({ id: 'rt-1', revoked: true })
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' })
      prisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await service.refresh({ refreshToken: 'valid-refresh-token' })

      expect(result.accessToken).toBe('new-token')
      expect(result.refreshToken).toBe('new-token')
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt-1' },
          data: { revoked: true },
        }),
      )
    })
  })
})
