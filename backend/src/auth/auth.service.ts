import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { createHash } from 'node:crypto'

import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })
    if (existing) {
      throw new ConflictException('Email already registered')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
      },
    })

    const tokens = await this.generateTokenPair(user)
    return { user: this.sanitizeUser(user), ...tokens }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password')
    }

    const tokens = await this.generateTokenPair(user)
    return { user: this.sanitizeUser(user), ...tokens }
  }

  async refresh(dto: { refreshToken: string }) {
    let payload: { sub: string; type: string }
    try {
      payload = this.jwtService.verify(dto.refreshToken)
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type')
    }

    const tokenHash = this.hashToken(dto.refreshToken)
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    })
    if (!stored) {
      throw new UnauthorizedException(
        'Refresh token has been revoked or expired',
      )
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    })

    const tokens = await this.generateTokenPair(user)
    return tokens
  }

  async logout(dto: { refreshToken: string }) {
    const tokenHash = this.hashToken(dto.refreshToken)
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revoked: false },
    })
    if (stored) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      })
    }
    return { message: 'Logged out successfully' }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    return this.sanitizeUser(user)
  }

  async generateTokenPair(user: { id: string; email: string; role: string }) {
    const accessToken = this.generateAccessToken(user)
    const refreshToken = this.generateRefreshToken(user)
    const tokenHash = this.hashToken(refreshToken)

    const decoded = this.jwtService.decode(refreshToken) as { exp: number }
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(decoded.exp * 1000),
      },
    })

    return { accessToken, refreshToken }
  }

  private generateAccessToken(user: {
    id: string
    email: string
    role: string
  }) {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' } as any,
    )
  }

  private generateRefreshToken(user: { id: string }) {
    return this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d' } as any,
    )
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private sanitizeUser(user: {
    id: string
    email: string
    displayName: string
    role: string
    createdAt: Date
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
