import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'

import { ComparisonPanel } from '@/components/comparison/comparison-panel'
import { ModeToggle, type ViewMode } from '@/components/comparison/mode-toggle'
import { ChatInput } from '@/components/chat/chat-input'
import { ProviderColumn, type StreamResponseState } from '@/components/chat/provider-column'
import { Spinner } from '@/components/ui/spinner'
import {
  getAccessToken,
  getComparison,
  getConversation,
  sendMessage as sendMessageApi,
  type ComparisonResult,
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
              if (msgId) {
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
  }, [conversationId, loadCompletedMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingResponses, scrollToBottom])

  async function handleSend(content: string) {
    if (!conversationId) return

    try {
      const result = await sendMessageApi(conversationId, content)

      const newMessage: MessageBrief = {
        id: result.message.id,
        role: result.message.role,
        content: result.message.content,
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

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-zinc-800 p-4">
          <Bot className="h-8 w-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-400">Select an investigation</h2>
        <p className="max-w-sm text-sm text-zinc-600">
          Choose an existing investigation from the sidebar or create a new one to start asking questions.
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
          className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          onClick={() => navigate('/dashboard')}
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  const hasComparisonData = comparisons.size > 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          {hasComparisonData && (
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
                <Bot className="h-10 w-10 text-emerald-400" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-zinc-200">Start your investigation</h2>
              <p className="max-w-md text-sm text-zinc-500">
                Ask a question about commissioning procedures, risks, equipment troubleshooting,
                or anything related to your power plant investigation.
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
                {msg.role === 'USER' && (
                  <div className="flex justify-end">
                    <div className="max-w-2xl rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 px-5 py-3 text-sm text-zinc-100 ring-1 ring-emerald-500/10">
                      {msg.content}
                    </div>
                  </div>
                )}

                {msg.role === 'USER' && viewMode !== 'consensus' && viewMode !== 'conflict' && (
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
                            className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-12"
                          >
                            <span className="text-xs text-zinc-600">No response</span>
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

                {msg.role === 'USER' && comparisons.has(msg.id) && (
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
