import { type FormEvent, useState } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string) => Promise<void>
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() || sending || disabled) return

    setSending(true)
    try {
      await onSend(content.trim())
      setContent('')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="flex items-end gap-3 border-t border-zinc-800 bg-zinc-950/80 px-4 py-4 backdrop-blur-xl" onSubmit={handleSubmit}>
      <div className="relative flex-1">
        <textarea
          className="min-h-[52px] w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 pr-12 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          disabled={disabled || sending}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Ask about commissioning procedures, risks, or next steps..."
          rows={1}
          value={content}
        />
      </div>
      <button
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50"
        disabled={!content.trim() || sending || disabled}
        type="submit"
      >
        {sending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ArrowUp className="h-5 w-5" />
        )}
      </button>
    </form>
  )
}
