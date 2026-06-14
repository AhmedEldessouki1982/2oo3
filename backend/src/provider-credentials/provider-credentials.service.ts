import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { Provider } from '@prisma/client'
import * as crypto from 'node:crypto'

import { PrismaService } from '../prisma/prisma.service'
import { EncryptionService } from './encryption.service'

@Injectable()
export class ProviderCredentialsService {
  private readonly logger = new Logger(ProviderCredentialsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async create(userId: string, provider: string, apiKey: string) {
    const existing = await this.prisma.providerCredential.findUnique({
      where: { userId_provider: { userId, provider: provider as Provider } },
    })
    if (existing) {
      throw new ConflictException(`Credential for ${provider} already exists — use update to rotate`)
    }

    const encryptedKeyMaterial = this.encryption.encrypt(apiKey)
    const keyFingerprint = this.fingerprint(apiKey)

    const credential = await this.prisma.providerCredential.create({
      data: {
        userId,
        provider: provider as Provider,
        encryptedKeyMaterial,
        keyFingerprint,
        enabled: true,
      },
      select: {
        id: true,
        provider: true,
        enabled: true,
        keyFingerprint: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await this.logCredentialEvent(userId, provider, 'CREATED')
    this.logger.debug(`Provider credential created: ${provider} for user ${userId}`)

    return credential
  }

  async findAll(userId: string) {
    const credentials = await this.prisma.providerCredential.findMany({
      where: { userId },
      orderBy: { provider: 'asc' },
      select: {
        id: true,
        provider: true,
        enabled: true,
        keyFingerprint: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return credentials
  }

  async update(userId: string, provider: string, apiKey: string) {
    const existing = await this.prisma.providerCredential.findFirst({
      where: { userId, provider: provider as Provider },
    })
    if (!existing) {
      throw new NotFoundException(`Credential for ${provider} not found`)
    }

    const encryptedKeyMaterial = this.encryption.encrypt(apiKey)
    const keyFingerprint = this.fingerprint(apiKey)

    const credential = await this.prisma.providerCredential.update({
      where: { id: existing.id },
      data: { encryptedKeyMaterial, keyFingerprint, enabled: true },
      select: {
        id: true,
        provider: true,
        enabled: true,
        keyFingerprint: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await this.logCredentialEvent(userId, provider, 'UPDATED')
    this.logger.debug(`Provider credential updated: ${provider} for user ${userId}`)

    return credential
  }

  async toggle(userId: string, provider: string) {
    const existing = await this.prisma.providerCredential.findFirst({
      where: { userId, provider: provider as Provider },
    })
    if (!existing) {
      throw new NotFoundException(`Credential for ${provider} not found`)
    }

    const credential = await this.prisma.providerCredential.update({
      where: { id: existing.id },
      data: { enabled: !existing.enabled },
      select: {
        id: true,
        provider: true,
        enabled: true,
        keyFingerprint: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await this.logCredentialEvent(userId, provider, credential.enabled ? 'ENABLED' : 'DISABLED')
    this.logger.debug(`Provider credential toggled: ${provider} enabled=${credential.enabled}`)

    return credential
  }

  async remove(userId: string, provider: string) {
    const existing = await this.prisma.providerCredential.findFirst({
      where: { userId, provider: provider as Provider },
    })
    if (!existing) {
      throw new NotFoundException(`Credential for ${provider} not found`)
    }

    await this.prisma.providerCredential.delete({ where: { id: existing.id } })

    await this.logCredentialEvent(userId, provider, 'DELETED')
    this.logger.debug(`Provider credential deleted: ${provider} for user ${userId}`)
  }

  async checkHealth(userId: string, provider: string) {
    const existing = await this.prisma.providerCredential.findFirst({
      where: { userId, provider: provider as Provider },
    })
    if (!existing) {
      return { provider, configured: false, healthy: false, message: 'No API key configured' }
    }
    if (!existing.enabled) {
      return { provider, configured: true, healthy: false, message: 'Provider is disabled' }
    }

    try {
      const apiKey = this.encryption.decrypt(existing.encryptedKeyMaterial)
      const healthy = await this.pingProvider(provider, apiKey)
      return {
        provider,
        configured: true,
        enabled: existing.enabled,
        healthy,
        message: healthy ? 'Connected' : 'API key rejected or quota exhausted',
      }
    } catch {
      return { provider, configured: true, enabled: existing.enabled, healthy: false, message: 'Decryption error' }
    }
  }

  private async pingProvider(provider: string, apiKey: string): Promise<boolean> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
      switch (provider) {
        case 'OPENAI': {
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
          })
          return res.ok
        }
        case 'ANTHROPIC': {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'ping' }],
            }),
            signal: controller.signal,
          })
          return res.ok
        }
        case 'GOOGLE': {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { signal: controller.signal },
          )
          return res.ok
        }
        default:
          return false
      }
    } catch {
      return false
    } finally {
      clearTimeout(timeout)
    }
  }

  private fingerprint(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16)
  }

  private async logCredentialEvent(
    userId: string,
    provider: string,
    event: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { userId, action: `CREDENTIAL_${event}`, resource: `provider:${provider}` },
      })
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${err}`)
    }
  }

  async findDecrypted(userId: string, provider: string): Promise<{
    provider: Provider
    enabled: boolean
    apiKey: string
  } | null> {
    const credential = await this.prisma.providerCredential.findFirst({
      where: { userId, provider: provider as Provider },
    })
    if (!credential) return null

    try {
      const apiKey = this.encryption.decrypt(credential.encryptedKeyMaterial)
      return {
        provider: credential.provider,
        enabled: credential.enabled,
        apiKey,
      }
    } catch (error) {
      this.logger.error(
        `Failed to decrypt credential for ${provider}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
      return null
    }
  }

  async listDecrypted(userId: string): Promise<Array<{ provider: Provider; apiKey: string | null; enabled: boolean }>> {
    const credentials = await this.prisma.providerCredential.findMany({
      where: { userId },
    })

    const results: Array<{ provider: Provider; apiKey: string | null; enabled: boolean }> = []
    for (const credential of credentials) {
      try {
        const apiKey = this.encryption.decrypt(credential.encryptedKeyMaterial)
        results.push({
          provider: credential.provider,
          enabled: credential.enabled,
          apiKey,
        })
      } catch (error) {
        this.logger.error(
          `Failed to decrypt credential for ${credential.provider}: ${error instanceof Error ? error.message : 'unknown'}`,
        )
        results.push({ provider: credential.provider, enabled: false, apiKey: null })
      }
    }
    return results
  }
}
