import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const KEY_ITERATIONS = 16384
const KEY_LENGTH = 32

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name)
  private readonly masterKey: Buffer

  constructor() {
    const secret = process.env.PROVIDER_KEY_ENCRYPTION_SECRET
    if (!secret || secret.length < 16) {
      this.logger.warn(
        'PROVIDER_KEY_ENCRYPTION_SECRET is missing or too short — using dev-only fallback. Never use in production.',
      )
      this.masterKey = crypto.scryptSync('dev-fallback-key', 'salt', KEY_LENGTH)
    } else {
      this.masterKey = crypto.scryptSync(secret, 'opencode-2oo3-key-derivation', KEY_LENGTH, {
        N: KEY_ITERATIONS,
        r: 8,
        p: 1,
      })
    }
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format')
    }
    const [ivHex, tagHex, encrypted] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv)
    decipher.setAuthTag(tag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
}
