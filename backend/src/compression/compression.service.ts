import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import { CompressionConfig } from './compression.config'

@Injectable()
export class CompressionService {
  private readonly logger = new Logger(CompressionService.name)

  constructor(private readonly prisma: PrismaService) {}

  async maybeCompress(conversationId: string): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    })
    if (!conversation) return false

    if (conversation.status === 'COMPACTING') return false

    const totalChars = await this.computeContextSize(conversationId)
    if (totalChars < CompressionConfig.MAX_CONTEXT_CHARS) {
      this.logger.debug(
        `Conversation ${conversationId} context size ${totalChars} below threshold ${CompressionConfig.MAX_CONTEXT_CHARS}`,
      )
      return false
    }

    this.logger.log(`Compression triggered for conversation ${conversationId} (${totalChars} chars)`)
    await this.compress(conversationId)
    return true
  }

  async compress(conversationId: string) {
    const startTime = Date.now()
    let compressedCount = 0

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'COMPACTING' },
    })

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        compressed: true,
        createdAt: true,
      },
    })

    const compressible = messages.filter(
      (m) =>
        !m.compressed &&
        (m.role === 'USER' || m.role === 'ASSISTANT') &&
        m.content.length >= CompressionConfig.MIN_MESSAGE_CHARS,
    )

    const toCompress = compressible.slice(
      0,
      Math.max(0, compressible.length - CompressionConfig.KEEP_RECENT_MESSAGES),
    )

    if (toCompress.length === 0) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'ACTIVE' },
      })
      return
    }

    const rollbackState: Array<{ id: string; content: string }> = toCompress.map((m) => ({
      id: m.id,
      content: m.content,
    }))

    compressedCount = toCompress.length
    const summary = this.generateSummary(toCompress.map((m) => ({ role: m.role, content: m.content })))

    await this.prisma.$transaction(async (tx) => {
      await tx.message.updateMany({
        where: { id: { in: toCompress.map((m) => m.id) } },
        data: { compressed: true },
      })

      const existingSummary = await tx.conversation.findUnique({
        where: { id: conversationId },
        select: { contextSummary: true },
      })

      const combined = existingSummary?.contextSummary
        ? `${existingSummary.contextSummary}\n\n${summary}`
        : summary

      const truncated =
        combined.length > CompressionConfig.MAX_SUMMARY_CHARS
          ? combined.slice(0, CompressionConfig.MAX_SUMMARY_CHARS) +
            '\n[Summary truncated due to length]'
          : combined

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          contextSummary: truncated,
          compressionState: JSON.stringify({
            rolledBackMessages: rollbackState,
            compressedAt: new Date().toISOString(),
            previousSummary: existingSummary?.contextSummary ?? null,
          }) as unknown as Prisma.InputJsonValue,
          lastCompressedAt: new Date(),
          status: 'ACTIVE',
        },
      })
    })

    const duration = Date.now() - startTime
    this.logger.log(
      `Compressed ${compressedCount} messages for conversation ${conversationId} in ${duration}ms`,
    )
  }

  async rollback(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    })
    if (!conversation?.compressionState) {
      throw new Error('No compression state to rollback')
    }

    const state = conversation.compressionState as {
      rolledBackMessages: Array<{ id: string; content: string }>
      previousSummary: string | null
    }

    await this.prisma.$transaction(async (tx) => {
      for (const msg of state.rolledBackMessages) {
        await tx.message.update({
          where: { id: msg.id },
          data: { compressed: false, content: msg.content },
        })
      }

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          contextSummary: state.previousSummary,
          compressionState: Prisma.DbNull,
          lastCompressedAt: null,
        },
      })
    })

    this.logger.debug(
      `Rolled back compression for conversation ${conversationId} (${state.rolledBackMessages.length} messages)`,
    )
  }

  private async computeContextSize(conversationId: string): Promise<number> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId, compressed: false },
      select: { content: true },
    })
    return messages.reduce((sum, m) => sum + m.content.length, 0)
  }

  private generateSummary(
    entries: Array<{ role: string; content: string }>,
  ): string {
    if (entries.length === 0) return ''

    const chunks: string[] = []
    let currentChunk = ''

    for (const entry of entries) {
      const label = entry.role === 'USER' ? 'Q' : 'A'
      const cleaned = this.cleanContent(entry.content)
      const line = `[${label}] ${cleaned}`

      if (currentChunk.length + line.length > 2000) {
        chunks.push(currentChunk.trim())
        currentChunk = line + '\n'
      } else {
        currentChunk += line + '\n'
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    const compressed = chunks.map((chunk) => this.summarizeChunk(chunk))

    const merged = compressed.join('\n\n')

    const preserved = this.extractCritical(entries.map((e) => e.content))

    return ['--- Compressed Context ---', merged, '', '--- Preserved Details ---', preserved].join(
      '\n',
    )
  }

  private cleanContent(content: string): string {
    let cleaned = content
    for (const pattern of CompressionConfig.STRIP_PATTERNS) {
      cleaned = cleaned.replace(pattern, '')
    }
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()
    return cleaned
  }

  private summarizeChunk(chunk: string): string {
    const lines = chunk.split('\n').filter(Boolean)
    const important: string[] = []

    for (const line of lines) {
      const stripped = line.replace(/^\[[QA]\]\s*/, '')
      if (stripped.length < 30) {
        important.push(line)
        continue
      }
      const sentences = stripped.split(/[.!?]+/).filter((s) => s.trim().length > 20)
      const kept = sentences.filter((s) => this.isImportant(s))
      if (kept.length > 0) {
        important.push(`[${line.startsWith('[Q]') ? 'Q' : 'A'}] ${kept.join('. ')}.`)
      }
    }

    return important.join('\n')
  }

  private isImportant(text: string): boolean {
    const lower = text.toLowerCase()
    const words = lower.split(/\s+/)

    if (words.length < 5) return false

    for (const pattern of CompressionConfig.PRESERVE_PATTERNS) {
      if (pattern.test(text)) return true
    }

    return false
  }

  private extractCritical(contents: string[]): string {
    const found = new Set<string>()

    for (const content of contents) {
      for (const pattern of CompressionConfig.PRESERVE_PATTERNS) {
        const matches = content.match(pattern)
        if (matches) {
          matches.forEach((m) => found.add(m))
        }
      }
    }

    const parts: string[] = []
    if (found.size > 0) {
      parts.push('Key terms: ' + [...found].join(', '))
    }

    const sentences = contents
      .join(' ')
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 20)

    const riskSentences = sentences.filter((s) =>
      /(risk|safe|hazard|fail|cau?tion|critical|emergency|must|shall|required)/i.test(s),
    )
    if (riskSentences.length > 0) {
      parts.push('Critical statements:')
      riskSentences.slice(0, 10).forEach((s) => parts.push(`- ${s.trim()}`))
    }

    return parts.join('\n')
  }
}
