import { Injectable, Logger } from '@nestjs/common'
import { Anthropic } from '@anthropic-ai/sdk'

import { ProviderCredentialsService } from '../provider-credentials/provider-credentials.service'

export interface LiveComparisonResult {
  conflicts: string[]
  consensus: string[]
  claudeUnique: string[]
  chatgptUnique: string[]
  geminiUnique: string[]
}

interface ProviderSummaries {
  claude: string
  chatgpt: string
  gemini: string
}

@Injectable()
export class LiveComparisonService {
  private readonly logger = new Logger(LiveComparisonService.name)

  constructor(
    private readonly credentialsService: ProviderCredentialsService,
  ) {}

  async analyze(
    summaries: ProviderSummaries,
    userId: string,
  ): Promise<LiveComparisonResult> {
    const anthropicKey = await this.getAnthropicKey(userId)

    if (anthropicKey) {
      try {
        return await this.claudeComparison(summaries, anthropicKey)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Claude analysis failed'
        this.logger.warn(`Falling back to heuristic comparison: ${message}`)
      }
    }

    return this.heuristicComparison(summaries)
  }

  private async getAnthropicKey(userId: string): Promise<string | null> {
    try {
      const credential = await this.credentialsService.findDecrypted(userId, 'ANTHROPIC')
      if (!credential || !credential.enabled) {
        return null
      }
      return credential.apiKey
    } catch {
      return null
    }
  }

  private async claudeComparison(
    summaries: ProviderSummaries,
    apiKey: string,
  ): Promise<LiveComparisonResult> {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0,
      max_tokens: 900,
      system:
        'You are a comparison engine. Return strict JSON with keys conflicts, consensus, claudeUnique, chatgptUnique, geminiUnique. Do not include markdown or prose.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Compare the following responses to the same prompt. Return JSON only.

Claude:
${summaries.claude}

ChatGPT:
${summaries.chatgpt}

Gemini:
${summaries.gemini}`,
            },
          ],
        },
      ],
    })

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('')

    try {
      const parsed = JSON.parse(content)
      return {
        conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
        consensus: Array.isArray(parsed.consensus) ? parsed.consensus : [],
        claudeUnique: Array.isArray(parsed.claudeUnique) ? parsed.claudeUnique : [],
        chatgptUnique: Array.isArray(parsed.chatgptUnique) ? parsed.chatgptUnique : [],
        geminiUnique: Array.isArray(parsed.geminiUnique) ? parsed.geminiUnique : [],
      }
    } catch (error) {
      throw new Error(
        `Claude returned non-JSON comparison: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  private heuristicComparison(summaries: ProviderSummaries): LiveComparisonResult {
    const clauses = this.normalize(summaries.claude)
    const openai = this.normalize(summaries.chatgpt)
    const google = this.normalize(summaries.gemini)

    const consensus: string[] = []
    const conflicts: string[] = []

    const overlap = this.commonSentences([clauses, openai, google])
    consensus.push(...overlap)

    const all = [clauses, openai, google]
    const labels = ['Claude', 'ChatGPT', 'Gemini']
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]
        const b = all[j]
        for (const sentence of a) {
          if (!b.includes(sentence)) {
            conflicts.push(`${labels[i]} vs ${labels[j]}: ${sentence}`)
          }
        }
      }
    }

    return {
      conflicts: dedupe(conflicts),
      consensus: dedupe(consensus),
      claudeUnique: this.uniqueSentences(clauses, [openai, google]),
      chatgptUnique: this.uniqueSentences(openai, [clauses, google]),
      geminiUnique: this.uniqueSentences(google, [clauses, openai]),
    }
  }

  private normalize(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0)
  }

  private commonSentences(groups: string[][]): string[] {
    if (groups.length === 0) return []
    const [first, ...rest] = groups
    return first.filter((sentence) => rest.every((g) => g.includes(sentence)))
  }

  private uniqueSentences(base: string[], others: string[][]): string[] {
    const flattened = new Set<string>(others.flat())
    return base.filter((sentence) => !flattened.has(sentence))
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)]
}
