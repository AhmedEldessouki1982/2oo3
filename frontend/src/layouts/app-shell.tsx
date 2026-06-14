import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Bot, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, Sparkles, Waves, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ConversationList } from '@/components/chat/conversation-list'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { createConversation, listConversations, deleteConversation, updateConversation, type ConversationSummary } from '@/lib/api'

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const loadConversations = useCallback(async (searchTerm?: string) => {
    setLoadingConversations(true)
    try {
      const result = await listConversations({
        limit: 50,
        ...(searchTerm ? { search: searchTerm } : {}),
      })
      setConversations(result.items)
    } catch {
      // silently fail
    } finally {
      setLoadingConversations(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadConversations(search || undefined)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, loadConversations])

  // Auto-refresh conversation list every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations(search || undefined)
    }, 30_000)
    return () => clearInterval(interval)
  }, [search, loadConversations])

  async function handleNewCommissioning() {
    try {
      const conv = await createConversation('New investigation', 'COMMISSIONING')
      setConversations((prev) => [conv, ...prev])
      navigate(`/app/conversations/${conv.id}`)
      setSidebarOpen(false)
    } catch {
      // silently fail
    }
  }

  async function handleNewChat() {
    try {
      const conv = await createConversation('New chat', 'CHAT')
      setConversations((prev) => [conv, ...prev])
      navigate(`/app/conversations/${conv.id}`)
      setSidebarOpen(false)
    } catch {
      // silently fail
    }
  }

  async function handleRename(id: string, title: string) {
    const updated = await updateConversation(id, title)
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
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
    navigate('/')
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-12rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <Link className="flex items-center gap-3" to="/dashboard">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/25">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-wide">2oo3</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              to="/dashboard"
            >
              <LayoutDashboard className="mr-1.5 inline-block h-4 w-4" />
              Dashboard
            </Link>
            <Link
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              to="/compare"
            >
              <Waves className="h-4 w-4 text-emerald-300" />
              Compare Lab
            </Link>
            <button
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleNewChat}
            >
              <Sparkles className="h-4 w-4 text-cyan-400" />
              Chat
            </button>
            <button
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleNewCommissioning}
            >
              <MessageSquare className="h-4 w-4" />
              Commissioning
            </button>
            <Link
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              to="/settings"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <ThemeToggle />
          <span className="hidden text-sm text-muted-foreground md:block">
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

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-overlay backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-background pt-16 transition-transform duration-300 md:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold tracking-wide">Navigation</span>
          <button
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <Link
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            to="/compare"
            onClick={() => setSidebarOpen(false)}
          >
            <Waves className="h-4 w-4 text-emerald-300" />
            Compare Lab
          </Link>
          <Link
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            to="/settings"
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <div className="mt-2 flex gap-2">
            <button
              className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                handleNewCommissioning()
                setSidebarOpen(false)
              }}
            >
              <MessageSquare className="h-4 w-4" />
              Commissioning
            </button>
            <button
              className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                handleNewChat()
                setSidebarOpen(false)
              }}
            >
              <Sparkles className="h-4 w-4 text-cyan-400" />
              Chat
            </button>
          </div>
        </div>

        <ConversationList
          conversations={conversations}
          loading={loadingConversations}
          onNew={handleNewCommissioning}
          onNewChat={handleNewChat}
          onDelete={handleDelete}
          onRename={handleRename}
          search={search}
          onSearchChange={setSearch}
        />

        <div className="border-t border-border p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-card-foreground">{user?.displayName}</p>
            <p className="text-xs text-subtle">{user?.email}</p>
          </div>
          <Button className="w-full" size="sm" variant="secondary" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-72 flex-col border-r border-border md:flex">
          <ConversationList
            conversations={conversations}
            loading={loadingConversations}
            onNew={handleNewCommissioning}
            onNewChat={handleNewChat}
            onDelete={handleDelete}
            onRename={handleRename}
            search={search}
            onSearchChange={setSearch}
          />
        </aside>

        <main className="relative flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
