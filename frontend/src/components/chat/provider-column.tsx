import { motion } from 'framer-motion'

function OpenAIIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="#10b981" r="10" />
      <path d="M8 12l3 3 5-5" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

function ClaudeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <rect height="20" rx="4" stroke="#a78bfa" strokeWidth="1.5" width="20" x="2" y="2" />
      <path d="M9 16l3-8 3 8" stroke="#a78bfa" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M10 14h4" stroke="#a78bfa" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  )
}

function GeminiIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z"
        fill="#60a5fa"
      />
    </svg>
  )
}

const providerThemes: Record<string, { accent: string; bg: string; border: string; text: string; icon: React.ReactNode }> = {
  OPENAI: {
    accent: 'from-emerald-400 to-emerald-500',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    text: 'text-emerald-300',
    icon: <OpenAIIcon />,
  },
  ANTHROPIC: {
    accent: 'from-violet-400 to-violet-500',
    bg: 'bg-violet-500/5',
    border: 'border-violet-500/20',
    text: 'text-violet-300',
    icon: <ClaudeIcon />,
  },
  GOOGLE: {
    accent: 'from-blue-400 to-blue-500',
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    text: 'text-blue-300',
    icon: <GeminiIcon />,
  },
}

const providerLabels: Record<string, string> = {
  OPENAI: 'ChatGPT',
  ANTHROPIC: 'Claude',
  GOOGLE: 'Gemini',
}

export interface StreamResponseState {
  id: string
  provider: string
  status: 'PENDING' | 'STREAMING' | 'COMPLETED' | 'FAILED'
  content: string
  errorSummary: string | null
  latencyMs: number | null
}

interface ProviderColumnProps {
  response: StreamResponseState
}

export function ProviderColumn({ response }: ProviderColumnProps) {
  const theme = providerThemes[response.provider] ?? providerThemes.OPENAI
  const label = providerLabels[response.provider] ?? response.provider

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col rounded-2xl border ${theme.border} ${theme.bg} overflow-hidden`}
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`flex items-center justify-between border-b ${theme.border} px-4 py-3`}>
        <div className="flex items-center gap-2">
          <div className="shrink-0">{theme.icon}</div>
          <div className={`h-2 w-2 rounded-full ${
            response.status === 'COMPLETED' ? 'bg-green-400' :
            response.status === 'FAILED' ? 'bg-red-400' :
            response.status === 'STREAMING' ? 'bg-yellow-400 animate-pulse' :
            'bg-zinc-600'
          }`} />
          <span className={`text-sm font-semibold ${theme.text}`}>{label}</span>
        </div>
            <span className="text-xs text-subtle">
          {response.status === 'COMPLETED' && response.latencyMs
            ? `${(response.latencyMs / 1000).toFixed(1)}s`
            : response.status === 'FAILED'
              ? 'Failed'
              : response.status === 'STREAMING'
                ? 'Streaming...'
                : 'Waiting'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {response.status === 'FAILED' ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="rounded-full bg-red-500/10 p-3">
              <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
              </svg>
            </div>
            <p className="text-sm text-red-400">Provider error</p>
            {response.errorSummary && (
              <p className="max-w-xs text-xs text-subtle">{response.errorSummary}</p>
            )}
          </div>
        ) : response.status === 'PENDING' ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  className={`h-2 w-2 rounded-full ${theme.text.replace('text-', 'bg-')}`}
                  transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            {response.content ? (
              response.content.split('\n').map((line, i) => (
                <p key={i} className={line.startsWith('>') ? 'text-subtle italic' : 'text-card-foreground'}>
                  {line}
                </p>
              ))
            ) : (
              <span className="text-subtle italic">Empty response</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
