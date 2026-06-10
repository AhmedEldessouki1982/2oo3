import { Injectable, Logger } from '@nestjs/common'
import { Prisma, Provider } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'

interface ParsedStatement {
  text: string
  normalized: string
  tokens: Set<string>
}

interface ComparisonSection {
  title: string
  findings: string[]
  severity?: 'info' | 'warning' | 'critical'
}

interface ComparisonOutput {
  agreements: ComparisonSection[]
  disagreements: ComparisonSection[]
  uniqueInsights: ComparisonSection[]
  hiddenRisks: ComparisonSection[]
  nextInvestigations: ComparisonSection[]
}

const RISK_KEYWORDS = [
  'risk', 'safety', 'hazard', 'danger', 'failure', 'damage', 'injury',
  'critical', 'severe', 'incident', 'accident', 'catastrophic',
  'unresolved', 'pending', 'delay', 'issue', 'problem', 'concern',
]

const RECOMMENDATION_KEYWORDS = [
  'recommend', 'should', 'must', 'ensure', 'verify', 'check',
  'investigate', 'hold', 'wait', 'confirm', 'validate', 'review',
  'complete', 'establish', 'perform', 'schedule', 'consider',
  'essential', 'required', 'necessary', 'important',
]

@Injectable()
export class ComparisonService {
  private readonly logger = new Logger(ComparisonService.name)

  constructor(private readonly prisma: PrismaService) {}

  async generateComparison(messageId: string, conversationId: string) {
    this.logger.debug(`Generating comparison for message ${messageId}`)

    const responses = await this.prisma.providerResponse.findMany({
      where: { messageId, status: 'COMPLETED' },
      select: { provider: true, content: true },
    })

    if (responses.length < 2) {
      this.logger.debug(`Not enough completed responses (${responses.length}) for message ${messageId}`)
      return null
    }

    try {
      const parsed = responses.map((r) => ({
        provider: r.provider,
        statements: this.extractStatements(r.content ?? ''),
      }))

      const result = this.analyze(parsed)

      const toJson = (v: unknown) => v as Prisma.InputJsonValue

      const comparison = await this.prisma.comparisonResult.upsert({
        where: { messageId },
        create: {
          conversationId,
          messageId,
          status: 'COMPLETED',
          agreements: toJson(result.agreements),
          disagreements: toJson(result.disagreements),
          uniqueInsights: toJson(result.uniqueInsights),
          risks: toJson(result.hiddenRisks),
          nextInvestigations: toJson(result.nextInvestigations),
        },
        update: {
          status: 'COMPLETED',
          agreements: toJson(result.agreements),
          disagreements: toJson(result.disagreements),
          uniqueInsights: toJson(result.uniqueInsights),
          risks: toJson(result.hiddenRisks),
          nextInvestigations: toJson(result.nextInvestigations),
        },
      })

      this.logger.debug(`Comparison persisted for message ${messageId}`)
      return comparison
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Comparison failed'
      this.logger.error(`Comparison failed for message ${messageId}: ${errorMessage}`)

      const emptyJson = [] as unknown as Prisma.InputJsonValue

      await this.prisma.comparisonResult.upsert({
        where: { messageId },
        create: {
          conversationId,
          messageId,
          status: 'FAILED',
          agreements: emptyJson,
          disagreements: emptyJson,
          uniqueInsights: emptyJson,
          risks: emptyJson,
          nextInvestigations: emptyJson,
          errorSummary: errorMessage,
        },
        update: {
          status: 'FAILED',
          errorSummary: errorMessage,
        },
      })

      return null
    }
  }

  async getComparison(messageId: string) {
    return this.prisma.comparisonResult.findUnique({
      where: { messageId },
      select: {
        id: true,
        status: true,
        agreements: true,
        disagreements: true,
        uniqueInsights: true,
        risks: true,
        nextInvestigations: true,
        errorSummary: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  private extractStatements(content: string): ParsedStatement[] {
    const lines = content.split('\n')
    const statements: ParsedStatement[] = []
    let current: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const numberedMatch = trimmed.match(/^\d+[.)]\s*(.*)/)
      const bulletMatch = trimmed.match(/^[-*]\s+(.*)/)
      const blockquote = trimmed.startsWith('>')

      if (numberedMatch || bulletMatch) {
        if (current.length > 0) {
          const text = current.join(' ').trim()
          if (text.length > 10) {
            statements.push(this.makeStatement(text))
          }
        }
        current = [numberedMatch ? numberedMatch[1] : bulletMatch![1]]
      } else if (!blockquote && trimmed.length > 0) {
        current.push(trimmed)
      }
    }

    if (current.length > 0) {
      const text = current.join(' ').trim()
      if (text.length > 10) {
        statements.push(this.makeStatement(text))
      }
    }

    return statements
  }

  private makeStatement(text: string): ParsedStatement {
    const clean = text
      .replace(/\*\*/g, '')
      .replace(/[*_~`]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim()

    const tokens = new Set(clean.split(' ').filter((t) => t.length > 2))
    return { text: text.trim(), normalized: clean, tokens }
  }

  private analyze(
    responses: Array<{ provider: Provider; statements: ParsedStatement[] }>,
  ): ComparisonOutput {
    const agreements: ComparisonSection[] = []
    const disagreements: ComparisonSection[] = []
    const uniqueInsights: ComparisonSection[] = []
    const hiddenRisks: ComparisonSection[] = []
    const nextInvestigations: ComparisonSection[] = []

    const allTracked = new Set<string>()

    const allStatements: Array<{
      statement: ParsedStatement
      provider: Provider
    }> = []

    for (const r of responses) {
      for (const s of r.statements) {
        allStatements.push({ statement: s, provider: r.provider })
      }
    }

    const paired: Set<string> = new Set()

    for (let i = 0; i < allStatements.length; i++) {
      if (paired.has(`${i}`)) continue
      const { statement: si, provider: pi } = allStatements[i]

      const related: Array<{ index: number; provider: Provider }> = []

      for (let j = i + 1; j < allStatements.length; j++) {
        if (paired.has(`${j}`)) continue
        const { statement: sj, provider: pj } = allStatements[j]

        if (pi === pj) continue

        const similarity = this.jaccardSimilarity(si.tokens, sj.tokens)
        if (similarity >= 0.3) {
          related.push({ index: j, provider: pj })
        }
      }

      if (related.length > 0) {
        const details = [
          this.stripLabel(si.text),
          ...related.map((r) => this.stripLabel(allStatements[r.index].statement.text)),
        ]

        agreements.push({
          title: this.makeTitle(details),
          findings: [...new Set(details)],
        })

        paired.add(`${i}`)
        for (const r of related) {
          paired.add(`${r.index}`)
        }
        for (const r of related) {
          allTracked.add(`${r.index}`)
        }
        allTracked.add(`${i}`)
      }
    }

    for (let i = 0; i < allStatements.length; i++) {
      if (paired.has(`${i}`) || allTracked.has(`${i}`)) continue
      const { statement: si, provider: pi } = allStatements[i]
      const text = this.stripLabel(si.text)

      if (this.hasRiskKeywords(si.normalized)) {
        hiddenRisks.push({
          title: `Risk flagged by ${pi}`,
          findings: [text],
          severity: si.normalized.includes('critical') || si.normalized.includes('severe')
            ? 'critical'
            : 'warning',
        })
      } else if (this.hasRecommendationKeywords(si.normalized)) {
        nextInvestigations.push({
          title: `Investigation from ${pi}`,
          findings: [text],
        })
      } else {
        uniqueInsights.push({
          title: `${pi} unique finding`,
          findings: [text],
        })
      }

      allTracked.add(`${i}`)
    }

    const titleCounts = new Map<string, number>()
    for (const a of agreements) {
      const key = a.title.toLowerCase()
      titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1)
    }
    const dedupedAgreements = agreements.filter(
      (a, idx) => agreements.findIndex(
        (b) => b.title.toLowerCase() === a.title.toLowerCase(),
      ) === idx,
    )

    const dedupedRisks = this.dedupSections(hiddenRisks)
    const dedupedNext = this.dedupSections(nextInvestigations)
    const dedupedUnique = this.dedupSections(uniqueInsights)

    return {
      agreements: dedupedAgreements,
      disagreements,
      uniqueInsights: dedupedUnique,
      hiddenRisks: dedupedRisks,
      nextInvestigations: dedupedNext,
    }
  }

  private hasRiskKeywords(text: string): boolean {
    return RISK_KEYWORDS.some((kw) => text.includes(kw))
  }

  private hasRecommendationKeywords(text: string): boolean {
    return RECOMMENDATION_KEYWORDS.some((kw) => text.includes(kw))
  }

  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    let intersection = 0
    for (const token of a) {
      if (b.has(token)) intersection++
    }
    const union = new Set([...a, ...b]).size
    return union === 0 ? 0 : intersection / union
  }

  private stripLabel(text: string): string {
    return text.replace(/^\d+[.)]\s*/, '').trim()
  }

  private makeTitle(details: string[]): string {
    const shortest = details.reduce((a, b) => (a.length <= b.length ? a : b))
    const truncated = shortest.length > 80 ? shortest.slice(0, 77) + '...' : shortest
    return truncated
  }

  private dedupSections(sections: ComparisonSection[]): ComparisonSection[] {
    const seen = new Set<string>()
    return sections.filter((s) => {
      const key = s.title.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}
