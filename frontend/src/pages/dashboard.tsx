import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, MessageSquare, Plus, Wrench } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { createConversation, listConversations, type ConversationSummary } from '@/lib/api'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)

  const loadConversations = useCallback(async () => {
    try {
      const data = await listConversations()
      setConversations(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  async function handleNewInvestigation() {
    try {
      const conv = await createConversation('New investigation')
      navigate(`/app/conversations/${conv.id}`)
    } catch {
      // silently fail
    }
  }

  const activeCount = conversations.filter((c) => c.status === 'ACTIVE').length

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome back, {user?.displayName}
          </h1>
          <p className="mt-2 text-zinc-400">
            Select an investigation or start a new one
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-cyan-400"
          onClick={handleNewInvestigation}
        >
          <Plus className="h-4 w-4" />
          New investigation
        </button>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900">
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
            <p className="mt-1 text-sm text-zinc-500">
              {activeCount === 0 ? 'No active conversations — start one!' : `${activeCount} investigation${activeCount === 1 ? '' : 's'} in progress`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Wrench className="h-5 w-5" />
              </div>
              <CardTitle>Available providers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-300">3</p>
            <p className="mt-1 text-sm text-zinc-500">
              ChatGPT · Claude · Gemini (simulated)
            </p>
          </CardContent>
        </Card>
      </div>

      {!loading && conversations.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-zinc-200">Recent investigations</h2>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className="flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800/50"
                onClick={() => navigate(`/app/conversations/${conv.id}`)}
              >
                <MessageSquare className="h-5 w-5 shrink-0 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-200">{conv.title}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
