import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@/lib/api'

interface ConversationListProps {
  conversations: ConversationSummary[]
  onNew: () => void
  onNewChat: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => Promise<ConversationSummary>
  loading?: boolean
  search?: string
  onSearchChange?: (value: string) => void
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ConversationList({ conversations, onNew, onNewChat, onDelete, onRename, loading, search, onSearchChange }: ConversationListProps) {
  const location = useLocation()
  const [focused, setFocused] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const handleClear = useCallback(() => {
    onSearchChange?.('')
    inputRef.current?.focus()
  }, [onSearchChange])

  const handleStartRename = useCallback((conv: ConversationSummary) => {
    setEditingId(conv.id)
    setEditValue(conv.title)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }, [])

  const handleFinishRename = useCallback(async (id: string) => {
    const trimmed = editValue.trim()
    if (!trimmed || editingId !== id) {
      setEditingId(null)
      return
    }
    try {
      await onRename(id, trimmed)
    } catch {
      // silently fail
    } finally {
      setEditingId(null)
    }
  }, [editValue, editingId, onRename])

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 px-4 py-3">
        <div className="flex gap-2">
          <button
            className="flex flex-1 items-center gap-2 rounded-xl border border-dashed border-muted px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-emerald-500/50 hover:text-emerald-300"
            onClick={onNew}
          >
            <MessageSquare className="h-4 w-4" />
            Commissioning
          </button>
          <button
            className="flex flex-1 items-center gap-2 rounded-xl border border-dashed border-muted px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-cyan-500/50 hover:text-cyan-300"
            onClick={onNewChat}
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            Chat
          </button>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-colors',
            focused
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-transparent bg-muted/50',
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Search conversations..."
            value={search ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleClear()
                inputRef.current?.blur()
              }
            }}
          />
          {search && (
            <button
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
          <p className="px-3 py-6 text-center text-xs text-subtle">
            {search ? 'No conversations match your search.' : 'No conversations yet. Create one to start.'}
          </p>
        ) : (
          conversations.map((conv) => {
            const isActive = location.pathname === `/app/conversations/${conv.id}`
            const isEditing = editingId === conv.id
            return (
              <div key={conv.id} className="group relative">
                {isEditing ? (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
                    <input
                      ref={editInputRef}
                      className="min-w-0 flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRename(conv.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={() => handleFinishRename(conv.id)}
                    />
                  </div>
                ) : (
                  <Link
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all',
                      isActive
                        ? 'bg-emerald-400/10 text-emerald-300'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-card-foreground',
                    )}
                    to={`/app/conversations/${conv.id}`}
                    onDoubleClick={(e) => {
                      e.preventDefault()
                      handleStartRename(conv)
                    }}
                  >
                    {conv.type === 'CHAT' ? (
                      <Sparkles className="h-4 w-4 shrink-0 text-cyan-400" />
                    ) : (
                      <MessageSquare className="h-4 w-4 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="block truncate">{conv.title}</span>
                      <span className="block text-[10px] text-subtle">
                        {timeAgo(conv.updatedAt)}
                      </span>
                    </div>
                    {conv.type === 'CHAT' && (
                      <span className="ml-1 shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] text-cyan-400">
                        Chat
                      </span>
                    )}
                  </Link>
                )}
                {!isEditing && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-subtle opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    onClick={() => onDelete(conv.id)}
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
