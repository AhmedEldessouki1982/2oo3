import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@/lib/api'

interface ConversationListProps {
  conversations: ConversationSummary[]
  onNew: () => void
  onDelete: (id: string) => void
  loading?: boolean
}

export function ConversationList({ conversations, onNew, onDelete, loading }: ConversationListProps) {
  const location = useLocation()

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <button
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:border-emerald-500/50 hover:text-emerald-300"
          onClick={onNew}
        >
          <Plus className="h-4 w-4" />
          New investigation
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  className="h-2 w-2 rounded-full bg-emerald-500"
                  transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-zinc-600">
            No investigations yet.
            <br />
            Create one to start.
          </p>
        ) : (
          conversations.map((conv) => {
            const isActive = location.pathname === `/app/conversations/${conv.id}`
            return (
              <div key={conv.id} className="group relative">
                <Link
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all',
                    isActive
                      ? 'bg-emerald-400/10 text-emerald-300'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
                  )}
                  to={`/app/conversations/${conv.id}`}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </Link>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  onClick={() => onDelete(conv.id)}
                  title="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
