import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, MessageSquare, Pencil, Plus, Search, Settings, Sparkles, Trash2, Wrench, X } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { useAnalytics } from '@/hooks/use-analytics'
import {
  checkCredentialHealth,
  createConversation,
  deleteConversation,
  listConversations,
  updateConversation,
  type ConversationSummary,
  type ProviderHealth,
} from '@/lib/api'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { track } = useAnalytics()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([])

  const loadConversations = useCallback(async () => {
    try {
      const [result, healthResults] = await Promise.all([
        listConversations({ search: search || undefined, page, limit: 20 }),
        Promise.allSettled(
          ['OPENAI', 'ANTHROPIC', 'GOOGLE'].map((p) => checkCredentialHealth(p)),
        ),
      ])
      setConversations(result.items)
      setTotalPages(result.totalPages)
      const health: ProviderHealth[] = []
      for (const r of healthResults) {
        if (r.status === 'fulfilled') health.push(r.value)
      }
      setProviderHealth(health)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  async function handleNewInvestigation() {
    try {
      const conv = await createConversation('New investigation', 'COMMISSIONING')
      track('conversation_created', { type: 'COMMISSIONING' })
      navigate(`/app/conversations/${conv.id}`)
    } catch {
      // silently fail
    }
  }

  async function handleNewChat() {
    try {
      const conv = await createConversation('New chat', 'CHAT')
      track('conversation_created', { type: 'CHAT' })
      navigate(`/app/conversations/${conv.id}`)
    } catch {
      // silently fail
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
  }

  async function confirmDelete(id: string) {
    try {
      await deleteConversation(id)
      track('conversation_deleted')
      setConversations((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // silently fail
    } finally {
      setDeletingId(null)
    }
  }

  function startRename(conv: ConversationSummary) {
    setEditingId(conv.id)
    setEditTitle(conv.title)
  }

  async function finishRename(id: string) {
    const trimmed = editTitle.trim()
    if (!trimmed) {
      setEditingId(null)
      return
    }
    try {
      const updated = await updateConversation(id, trimmed)
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)))
    } catch {
      // silently fail
    } finally {
      setEditingId(null)
    }
  }

  const activeCount = conversations.filter((c) => c.status === 'ACTIVE').length

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.displayName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Select an investigation or start a new one
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted"
            onClick={handleNewChat}
          >
            <Sparkles className="h-4 w-4" />
            Chat
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:from-emerald-400 hover:to-cyan-400 hover:shadow-emerald-500/35"
            onClick={handleNewInvestigation}
          >
            <Plus className="h-4 w-4" />
            Commissioning
          </button>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <Bot className="h-5 w-5" />
              </div>
              <CardTitle>Active investigations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-300">{activeCount}</p>
            <p className="mt-1 text-sm text-subtle">
              {activeCount === 0
                ? 'No active conversations — start one!'
                : `${activeCount} investigation${activeCount === 1 ? '' : 's'} in progress`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="flex flex-1 items-center justify-between">
                <CardTitle>Available providers</CardTitle>
                <button
                  className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => navigate('/settings')}
                  title="Manage provider keys"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-300">
              {providerHealth.filter((h) => h.healthy).length}
              <span className="ml-2 text-base font-normal text-subtle">/ 3</span>
            </p>
            <p className="mt-1 text-sm text-subtle">
              {providerHealth.length > 0
                ? providerHealth
                    .map((h) => `${h.provider.charAt(0) + h.provider.slice(1).toLowerCase()}${h.healthy ? '' : ' (offline)'}`)
                    .join(' · ')
                : 'ChatGPT · Claude · Gemini (simulated)'}
            </p>
          </CardContent>
        </Card>
      </div>

      {!loading && conversations.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-card-foreground">Investigations</h2>
            <div className="relative ml-auto max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                className="pl-10"
                placeholder="Search investigations..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground"
                  onClick={() => setSearchInput('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card/50 px-5 py-4 transition-all hover:border-muted hover:bg-muted/50"
              >
                {editingId === conv.id ? (
                  <Input
                    className="flex-1"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishRename(conv.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => finishRename(conv.id)}
                    autoFocus
                  />
                ) : deletingId === conv.id ? (
                  <div className="flex flex-1 items-center gap-3">
                    <span className="text-sm text-destructive">Delete this investigation?</span>
                    <button
                          className="rounded-full bg-destructive px-4 py-1.5 text-sm font-semibold text-white hover:bg-destructive/90"
                          onClick={() => confirmDelete(conv.id)}
                        >
                          Confirm
                        </button>
                        <button
                          className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => navigate(`/app/conversations/${conv.id}`)}
                    >
                      {conv.type === 'CHAT' ? (
                        <Sparkles className="h-5 w-5 shrink-0 text-cyan-400" />
                      ) : (
                        <MessageSquare className="h-5 w-5 shrink-0 text-subtle" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-card-foreground">{conv.title}</p>
                        <p className="text-xs text-subtle">
                          {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        className="rounded-lg p-1.5 text-subtle hover:bg-muted hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          startRename(conv)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-subtle hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(conv.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-sm text-subtle">
                Page {page} of {totalPages}
              </span>
              <button
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
