import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Bot, LogOut, Menu, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConversationList } from '@/components/chat/conversation-list'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { createConversation, listConversations, deleteConversation, type ConversationSummary } from '@/lib/api'

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true)
    try {
      const data = await listConversations()
      setConversations(data)
    } catch {
      // silently fail
    } finally {
      setLoadingConversations(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  async function handleNew() {
    try {
      const conv = await createConversation('New investigation')
      setConversations((prev) => [conv, ...prev])
      navigate(`/app/conversations/${conv.id}`)
      setSidebarOpen(false)
    } catch {
      // silently fail
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // silently fail
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-12rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-300 md:relative md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-4">
          <Link className="flex items-center gap-3" to="/dashboard">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/25">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">2oo3</p>
              <p className="text-xs text-zinc-500">Commissioning copilot</p>
            </div>
          </Link>
        </div>

        <ConversationList
          conversations={conversations}
          loading={loadingConversations}
          onDelete={handleDelete}
          onNew={handleNew}
        />

        <div className="border-t border-zinc-800 p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-zinc-200">{user?.displayName}</p>
            <p className="text-xs text-zinc-500">{user?.email}</p>
          </div>
          <Button
            className="w-full"
            size="sm"
            variant="secondary"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur-xl md:px-6">
          <button
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:block" />

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-400 md:block">
              {user?.displayName}
            </span>
            <Button
              className="hidden md:inline-flex"
              size="sm"
              variant="secondary"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        <main className="relative flex h-[calc(100vh-57px)] flex-1">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <button
          className="fixed right-4 top-4 z-50 rounded-lg bg-zinc-800 p-2 text-zinc-400 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
