import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Sparkles, Waves, Send, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAnalytics } from '@/hooks/use-analytics'
import { getAccessToken } from '@/lib/api'
import { cn } from '@/lib/utils'

type ProviderKey = 'claude' | 'chatgpt' | 'gemini'

interface StreamEventPayload {
  source: ProviderKey | 'comparison' | 'system'
  token?: string
  done?: boolean
  error?: string
}

interface ComparisonPayload {
  conflicts: string[]
  consensus: string[]
  claudeUnique: string[]
  chatgptUnique: string[]
  geminiUnique: string[]
}

const PROVIDER_META: Record<ProviderKey, { label: string; accent: string; glow: string }> = {
  claude: {
    label: 'Claude',
    accent: 'from-amber-500 via-amber-400 to-yellow-400',
    glow: 'shadow-[0_0_35px_rgba(251,191,36,0.35)]',
  },
  chatgpt: {
    label: 'ChatGPT',
    accent: 'from-emerald-500 via-teal-400 to-cyan-400',
    glow: 'shadow-[0_0_35px_rgba(20,184,166,0.35)]',
  },
  gemini: {
    label: 'Gemini',
    accent: 'from-sky-500 via-blue-400 to-indigo-400',
    glow: 'shadow-[0_0_35px_rgba(59,130,246,0.35)]',
  },
}

export default function ComparePage() {
  const [prompt, setPrompt] = useState('')
  const [responses, setResponses] = useState<Record<ProviderKey, string>>({
    claude: '',
    chatgpt: '',
    gemini: '',
  })
  const [completed, setCompleted] = useState<Record<ProviderKey, boolean>>({
    claude: false,
    chatgpt: false,
    gemini: false,
  })
  const [comparison, setComparison] = useState<ComparisonPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const { track } = useAnalytics()

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  const handleCompare = () => {
    if (!prompt.trim()) {
      setError('Enter a question to compare responses.')
      return
    }

    const token = getAccessToken()
    if (!token) {
      setError('You need to sign in again to run a comparison.')
      return
    }

    eventSourceRef.current?.close()

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const url = `${baseUrl}/compare/stream?prompt=${encodeURIComponent(prompt)}&token=${token}`

    const es = new EventSource(url)
    eventSourceRef.current = es

    setIsStreaming(true)
    setResponses({ claude: '', chatgpt: '', gemini: '' })
    setCompleted({ claude: false, chatgpt: false, gemini: false })
    setComparison(null)
    setError(null)

    es.onmessage = (event) => {
      try {
        const payload: StreamEventPayload = JSON.parse(event.data)

        if (payload.source === 'system' && payload.error) {
          setError(payload.error)
          setIsStreaming(false)
          es.close()
          return
        }

        if (payload.source === 'comparison') {
          if (payload.token) {
            try {
              const data = JSON.parse(payload.token) as ComparisonPayload
              setComparison(data)
            } catch {
              setError('Comparison analysis could not be parsed.')
            }
          }
          setIsStreaming(false)
          es.close()
          track('comparison_viewed')
          return
        }

        if (payload.source && isProvider(payload.source)) {
          if (payload.error) {
            setError((prev) => prev ?? `${PROVIDER_META[payload.source].label} could not generate a response.`)
            setCompleted((prev) => ({ ...prev, [payload.source]: true }))
            return
          }

          if (payload.token) {
            setResponses((prev) => ({
              ...prev,
              [payload.source]: prev[payload.source] + payload.token,
            }))
          }

          if (payload.done) {
            setCompleted((prev) => ({ ...prev, [payload.source]: true }))
          }
        }
      } catch {
        // ignore malformed event
      }
    }

    es.onerror = () => {
      setError('Streaming connection interrupted.')
      setIsStreaming(false)
      es.close()
    }

    track('comparison_requested', { source: 'compare_lab' })
  }

  const allDone = Object.values(completed).every(Boolean)

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10"
    >
      <header className="space-y-3 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
          <Waves className="h-3.5 w-3.5" />
          Live Comparison Lab
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Stream answers from Claude, ChatGPT, and Gemini side by side
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          Bring your own API keys or run in simulated mode. We stream each provider in parallel and analyze conflicts, consensus, and unique findings as soon as they finish.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <Textarea
            className="h-32 flex-1 resize-none border border-border/50 bg-background text-sm text-foreground placeholder:text-subtle focus-visible:border-emerald-400/60 focus-visible:ring-emerald-500/20"
            placeholder="Ask a commissioning or engineering question to compare approaches..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={isStreaming}
          />
          <Button
            size="lg"
            className="h-[3.25rem] min-w-[10rem] rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-base font-semibold text-white shadow-[0_15px_45px_rgba(16,185,129,0.25)] transition-all hover:shadow-[0_18px_55px_rgba(16,185,129,0.35)]"
            onClick={handleCompare}
            disabled={isStreaming}
          >
            {isStreaming ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Streaming
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Compare
              </>
            )}
          </Button>
        </div>
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {(Object.keys(PROVIDER_META) as ProviderKey[]).map((provider) => {
          const meta = PROVIDER_META[provider]
          const text = responses[provider]
          const done = completed[provider]
          return (
            <article
              key={provider}
              className={cn(
                'group relative overflow-hidden rounded-3xl border border-border bg-card/50 p-5 backdrop-blur-sm transition-all',
                done ? 'ring-1 ring-emerald-400/40' : '',
              )}
            >
              <div className={cn('absolute inset-0 opacity-20 blur-3xl transition-opacity group-hover:opacity-40', meta.glow)} />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtle">{meta.label}</p>
                  <h2 className="text-lg font-semibold text-card-foreground">{done ? 'Completed' : 'Streaming'}</h2>
                </div>
                <div className={cn('rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg', `bg-gradient-to-r ${meta.accent}`)}>
                  {done ? 'Ready' : 'Live'}
                </div>
              </div>
              <div className="relative mt-4 max-h-64 overflow-y-auto rounded-2xl border border-border/50 bg-black/20 p-4 text-sm leading-relaxed text-muted-foreground">
                {text ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground prose-a:text-emerald-400 prose-strong:text-foreground prose-code:text-emerald-300 prose-code:bg-card prose-code:px-1 prose-code:rounded prose-pre:bg-card prose-pre:border prose-pre:border-border prose-th:text-foreground prose-td:text-foreground prose-li:text-foreground prose-blockquote:text-subtle">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-subtle">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Waiting for {meta.label}...
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </section>

      <section className="rounded-3xl border border-border bg-card/60 p-6">
        <header className="flex items-center gap-3">
          <CheckCircle2 className={cn('h-5 w-5', allDone ? 'text-emerald-400' : 'text-subtle')} />
          <h2 className="text-xl font-semibold text-card-foreground">Comparison Analysis</h2>
        </header>

        {!comparison && (
          <p className="mt-3 text-sm text-subtle">
            {isStreaming
              ? 'Hang tight — we will summarize agreements, conflicts, and unique insights once all providers finish.'
              : 'Run a comparison to see where providers align or disagree.'}
          </p>
        )}

        {comparison && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InsightCard title="Consensus" tone="emerald" items={comparison.consensus} icon="consensus" />
            <InsightCard title="Conflicts" tone="amber" items={comparison.conflicts} icon="conflict" />
            <InsightCard title="Claude Unique" tone="purple" items={comparison.claudeUnique} icon="claude" />
            <InsightCard title="ChatGPT Unique" tone="cyan" items={comparison.chatgptUnique} icon="chatgpt" />
            <InsightCard title="Gemini Unique" tone="blue" items={comparison.geminiUnique} icon="gemini" />
          </div>
        )}
      </section>
    </motion.div>
  )
}

function InsightCard({
  title,
  items,
  tone,
  icon,
}: {
  title: string
  items: string[]
  tone: 'emerald' | 'amber' | 'purple' | 'cyan' | 'blue'
  icon: 'consensus' | 'conflict' | 'claude' | 'chatgpt' | 'gemini'
}) {
  const toneMap: Record<typeof tone, string> = {
    emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-500/50 bg-amber-500/10 text-amber-100',
    purple: 'border-purple-500/50 bg-purple-500/10 text-purple-100',
    cyan: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-100',
    blue: 'border-blue-500/50 bg-blue-500/10 text-blue-100',
  }

  const iconMap: Record<typeof icon, JSX.Element> = {
    consensus: <CheckCircle2 className="h-4 w-4" />,
    conflict: <AlertCircle className="h-4 w-4" />,
    claude: <Sparkles className="h-4 w-4" />,
    chatgpt: <Sparkles className="h-4 w-4 rotate-6" />,
    gemini: <Sparkles className="h-4 w-4 -rotate-6" />,
  }

  return (
    <div className={cn('rounded-2xl border p-4 backdrop-blur-sm', toneMap[tone])}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
        {iconMap[icon]}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs italic opacity-75">No points captured.</p>
      ) : (
        <ul className="space-y-2 text-sm text-foreground">
          {items.map((item, index) => (
            <li key={index} className="rounded-xl bg-black/20 px-3 py-2 prose prose-invert prose-sm prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-headings:text-foreground max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {item}
              </ReactMarkdown>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function isProvider(value: string): value is ProviderKey {
  return value === 'claude' || value === 'chatgpt' || value === 'gemini'
}
