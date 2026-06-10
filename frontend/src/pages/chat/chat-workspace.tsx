import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, ChevronDown, ChevronRight, FileText, Sparkles } from 'lucide-react'

import { ComparisonPanel } from '@/components/comparison/comparison-panel'
import { ModeToggle, type ViewMode } from '@/components/comparison/mode-toggle'
import { ChatInput } from '@/components/chat/chat-input'
import { ProviderColumn, type StreamResponseState } from '@/components/chat/provider-column'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import {
  getAccessToken,
  getComparison,
  getConversation,
  sendMessage as sendMessageApi,
  uploadAttachment,
  type ComparisonResult,
  type ConversationType,
  type MessageBrief,
} from '@/lib/api'

const PROVIDERS = ['OPENAI', 'ANTHROPIC', 'GOOGLE']

export default function ChatWorkspacePage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageBrief[]>([])
  const [convType, setConvType] = useState<ConversationType>('COMMISSIONING')
  const [contextSummary, setContextSummary] = useState<string | null>(null)
  const [lastCompressedAt, setLastCompressedAt] = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [streamingResponses, setStreamingResponses] = useState<Map<string, StreamResponseState>>(new Map())
  const [comparisons, setComparisons] = useState<Map<string, ComparisonResult | null>>(new Map())
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('structured')
  const lastSentMessageRef = useRef<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!conversationId) return

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getConversation(conversationId!)
        setMessages(data.messages)
        setConvType(data.type)
        setContextSummary(data.contextSummary)
        setLastCompressedAt(data.lastCompressedAt)
      } catch {
        setError('Failed to load conversation')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [conversationId])

  async function loadCompletedMessages() {
    if (!conversationId) return
    try {
      const data = await getConversation(conversationId)
      setMessages(data.messages)
      setContextSummary(data.contextSummary)
      setLastCompressedAt(data.lastCompressedAt)
    } catch {
      // silently fail
    }
  }

  async function loadComparison(messageId: string) {
    try {
      setComparisonLoading(true)
      const result = await getComparison(messageId)
      setComparisons((prev) => {
        const next = new Map(prev)
        next.set(messageId, result)
        return next
      })
    } catch {
      // silently fail
    } finally {
      setComparisonLoading(false)
    }
  }

  useEffect(() => {
    if (!conversationId) return

    const token = getAccessToken()
    if (!token) return

    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/conversations/${conversationId!}/stream?token=${token}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data)

        setStreamingResponses((prev) => {
          const next = new Map(prev)
          const existing = next.get(data.providerResponseId) || {
            id: data.providerResponseId,
            provider: data.provider,
            status: 'STREAMING' as const,
            content: '',
            errorSummary: null,
            latencyMs: null,
          }

          if (data.error) {
            next.set(data.providerResponseId, {
              ...existing,
              status: 'FAILED',
              errorSummary: data.error,
            })
          } else if (data.done) {
            next.set(data.providerResponseId, {
              ...existing,
              status: existing.errorSummary ? 'FAILED' : 'COMPLETED',
            })
            setTimeout(() => {
              setStreamingResponses((prev2) => {
                const next2 = new Map(prev2)
                next2.delete(data.providerResponseId)
                return next2
              })
              loadCompletedMessages()
              const msgId = lastSentMessageRef.current
              if (msgId && convType === 'COMMISSIONING') {
                setTimeout(() => loadComparison(msgId), 500)
              }
            }, 2000)
          } else if (data.chunk) {
            next.set(data.providerResponseId, {
              ...existing,
              content: existing.content + data.chunk,
              status: 'STREAMING',
            })
          }

          return next
        })
      } catch {
        // ignore parse errors
      }
    })

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [conversationId, loadCompletedMessages, convType])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingResponses, scrollToBottom])

  async function handleSend(content: string, files: File[]) {
    if (!conversationId) return

    try {
      const attachmentIds: string[] = []
      if (files.length > 0) {
        for (const file of files) {
          const uploaded = await uploadAttachment(conversationId, file)
          attachmentIds.push(uploaded.id)
        }
      }

      const result = await sendMessageApi(conversationId, content, attachmentIds)

      const newMessage: MessageBrief = {
        id: result.message.id,
        role: result.message.role,
        content: result.message.content,
        compressed: false,
        createdAt: result.message.createdAt,
        providerResponses: [],
      }

      setMessages((prev) => [...prev, newMessage])
      lastSentMessageRef.current = result.message.id

      const newStreamResponses = new Map<string, StreamResponseState>()
      for (const pr of result.providerResponses) {
        newStreamResponses.set(pr.id, {
          id: pr.id,
          provider: pr.provider,
          status: 'PENDING',
          content: '',
          errorSummary: null,
          latencyMs: null,
        })
      }
      setStreamingResponses(newStreamResponses)
    } catch {
      // silently fail
    }
  }

  function hasActiveStreaming() {
    for (const resp of streamingResponses.values()) {
      if (resp.status === 'PENDING' || resp.status === 'STREAMING') {
        return true
      }
    }
    return false
  }

  function findFirstCompressedIndex(): number {
    return messages.findIndex((m) => m.compressed)
  }

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <Bot className="h-8 w-8 text-subtle" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground">Select an investigation</h2>
        <p className="max-w-sm text-sm text-subtle">
          Choose an existing conversation from the sidebar or create a new one.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8 text-emerald-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-red-400">{error}</p>
        <button
          className="rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          onClick={() => navigate('/dashboard')}
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  const hasComparisonData = comparisons.size > 0
  const firstCompressedIdx = findFirstCompressedIndex()
  const hasCompression = firstCompressedIdx >= 0
  const isGeneral = convType === 'GENERAL'

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className={isGeneral ? 'mx-auto max-w-3xl space-y-6 px-4 py-6' : 'mx-auto max-w-7xl space-y-6 px-4 py-6'}>
          {hasComparisonData && !isGeneral && (
            <div className="flex justify-center">
              <ModeToggle onChange={setViewMode} value={viewMode} />
            </div>
          )}

          {messages.length === 0 && !hasActiveStreaming() ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-4 rounded-full bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
                {isGeneral ? (
                  <Sparkles className="h-10 w-10 text-cyan-400" />
                ) : (
                  <Bot className="h-10 w-10 text-emerald-400" />
                )}
              </div>
              <h2 className="mb-2 text-xl font-semibold text-card-foreground">
                {isGeneral ? 'Start a conversation' : 'Start your investigation'}
              </h2>
              <p className="max-w-md text-sm text-subtle">
                {isGeneral
                  ? 'Ask anything — get answers from a single AI model.'
                  : 'Ask a question about commissioning procedures, risks, equipment troubleshooting, or anything related to your power plant investigation.'
                }
              </p>
            </motion.div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                initial={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                {hasCompression && idx === firstCompressedIdx && lastCompressedAt && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <button
                      className="flex w-full items-center gap-2 text-left text-sm font-medium text-amber-400"
                      onClick={() => setSummaryOpen(!summaryOpen)}
                    >
                      {summaryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <FileText className="h-4 w-4" />
                      Compressed context
                      <span className="text-xs text-amber-400/60">
                        — earlier messages summarized {new Date(lastCompressedAt).toLocaleDateString()}
                      </span>
                    </button>
                    {summaryOpen && contextSummary && (
                      <div className="mt-2 whitespace-pre-wrap rounded-xl bg-amber-500/5 px-3 py-2 font-mono text-xs text-amber-200/80">
                        {contextSummary}
                      </div>
                    )}
                  </div>
                )}

                {msg.role === 'USER' && (
                  <div className="flex justify-end">
                    <div className={cn(
                      'max-w-2xl rounded-2xl px-5 py-3 text-sm text-foreground ring-1',
                      isGeneral
                        ? 'bg-cyan-500/10 ring-cyan-500/10'
                        : 'bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 ring-emerald-500/10',
                    )}>
                      {msg.content}
                    </div>
                  </div>
                )}

                {/* GENERAL: single column assistant response */}
                {isGeneral && msg.role === 'USER' && (
                  <div>
                    {msg.providerResponses?.map((resp) => (
                      resp.content && (
                        <div
                          key={resp.id}
                          className="rounded-2xl border border-border bg-card/50 px-5 py-4 text-sm leading-relaxed text-card-foreground"
                        >
                          {resp.content}
                        </div>
                      )
                    ))}
                    {Array.from(streamingResponses.values()).map((sr) => (
                      <div
                        key={sr.id}
                        className="rounded-2xl border border-border bg-card/50 px-5 py-4 text-sm leading-relaxed text-card-foreground"
                      >
                        {sr.content || (sr.status === 'PENDING' ? (
                          <span className="text-subtle">Thinking...</span>
                        ) : sr.status === 'FAILED' ? (
                          <span className="text-red-400">Failed to get response</span>
                        ) : (
                          <span className="text-subtle">Generating...</span>
                        ))}
                        {sr.status === 'STREAMING' && (
                          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-emerald-400" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* COMMISSIONING: 3-column provider responses */}
                {!isGeneral && msg.role === 'USER' && viewMode !== 'consensus' && viewMode !== 'conflict' && (
                  <div className="grid gap-4 md:grid-cols-3">
                    {PROVIDERS.map((provider) => {
                      const fromStore = msg.providerResponses?.find(
                        (r) => r.provider === provider,
                      )

                      const inStream = Array.from(streamingResponses.values()).find(
                        (r) => r.provider === provider,
                      )

                      const response = inStream ?? fromStore

                      if (!response) {
                        return (
                          <div
                            key={provider}
                            className="flex items-center justify-center rounded-2xl border border-dashed border-muted py-12"
                          >
                            <span className="text-xs text-subtle">No response</span>
                          </div>
                        )
                      }

                      return (
                        <ProviderColumn
                          key={response.id}
                          response={{
                            id: response.id,
                            provider: response.provider as StreamResponseState['provider'],
                            status: response.status as StreamResponseState['status'],
                            content: response.content ?? '',
                            errorSummary: 'errorSummary' in response ? (response as StreamResponseState).errorSummary : null,
                            latencyMs: 'latencyMs' in response ? (response as StreamResponseState).latencyMs : null,
                          }}
                        />
                      )
                    })}
                  </div>
                )}

                {!isGeneral && msg.role === 'USER' && comparisons.has(msg.id) && (
                  <ComparisonPanel
                    loading={comparisonLoading}
                    mode={viewMode}
                    result={comparisons.get(msg.id) ?? null}
                  />
                )}
              </motion.div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput disabled={hasActiveStreaming()} onSend={handleSend} />
    </div>
  )
}


