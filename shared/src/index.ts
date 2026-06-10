export const MODEL_PROVIDERS = ['openai', 'anthropic', 'google'] as const

export type ModelProvider = (typeof MODEL_PROVIDERS)[number]

export type ProviderRunStatus =
  | 'queued'
  | 'streaming'
  | 'succeeded'
  | 'failed'
  | 'skipped'

export type SharedContextSource =
  | 'prompt'
  | 'history'
  | 'note'
  | 'attachment'
  | 'web-research'
  | 'compressed-memory'

export interface SharedContextItem {
  readonly source: SharedContextSource
  readonly content: string
  readonly referenceId?: string
}

export interface ProviderRunSummary {
  readonly provider: ModelProvider
  readonly status: ProviderRunStatus
  readonly latencyMs?: number
  readonly errorCode?: string
}

export interface ComparisonSection {
  readonly title: string
  readonly findings: readonly string[]
  readonly severity?: 'info' | 'warning' | 'critical'
}

export interface ComparisonResultContract {
  readonly agreements: readonly ComparisonSection[]
  readonly disagreements: readonly ComparisonSection[]
  readonly uniqueInsights: readonly ComparisonSection[]
  readonly hiddenRisks: readonly ComparisonSection[]
  readonly nextInvestigations: readonly ComparisonSection[]
}

export function createContextFingerprint(
  context: readonly SharedContextItem[],
): string {
  return JSON.stringify(
    context.map((item) => ({
      content: item.content,
      referenceId: item.referenceId ?? null,
      source: item.source,
    })),
  )
}
