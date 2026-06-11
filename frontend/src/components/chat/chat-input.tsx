import { type FormEvent, useRef, useState } from 'react'
import { AlertCircle, ArrowUp, FileText, Image, Loader2, Paperclip, Table, X } from 'lucide-react'

const MAX_FILE_SIZE_BYTES = Number(import.meta.env.VITE_MAX_FILE_SIZE_BYTES) || 20 * 1024 * 1024

interface FileAttachment {
  file: File
  id: string
}

interface ChatInputProps {
  onSend: (content: string, files: File[]) => Promise<void>
  disabled: boolean
  conversationType?: 'COMMISSIONING' | 'CHAT'
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image className="h-3 w-3 shrink-0" />
  if (mime.includes('spreadsheet') || mime.includes('csv')) return <Table className="h-3 w-3 shrink-0" />
  return <FileText className="h-3 w-3 shrink-0" />
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ChatInput({ onSend, disabled, conversationType }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if ((!content.trim() && attachments.length === 0) || sending || disabled) return

    setSending(true)
    try {
      await onSend(content.trim(), attachments.map((a) => a.file))
      setContent('')
      setAttachments([])
    } finally {
      setSending(false)
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const oversized = files.filter((f) => f.size > MAX_FILE_SIZE_BYTES)
    if (oversized.length > 0) {
      setFileError(
        `${oversized[0].name} exceeds the 20 MB file size limit.`,
      )
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    const newAttachments = files.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}`,
    }))
    setAttachments((prev) => [...prev, ...newAttachments])

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <form className="border-t border-border bg-background/80 px-4 py-4 backdrop-blur-xl" onSubmit={handleSubmit}>
      {fileError && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {fileError}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 px-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground"
            >
              {fileIcon(att.file.type)}
              <span className="max-w-[120px] truncate">{att.file.name}</span>
              <span className="text-subtle">({formatSize(att.file.size)})</span>
              <button
                className="ml-0.5 rounded p-0.5 hover:bg-muted"
                onClick={() => removeAttachment(att.id)}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-3">
        <input
          accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.bmp,.tiff"
          className="hidden"
          multiple
          onChange={handleFilePick}
          ref={fileInputRef}
          type="file"
        />
        <button
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-40"
          disabled={sending || disabled}
          onClick={() => fileInputRef.current?.click()}
          title="Attach document"
          type="button"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <textarea
            className="min-h-[52px] w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 pr-12 text-sm text-foreground placeholder-subtle outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            disabled={disabled || sending}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder={conversationType === 'CHAT' ? 'Ask anything...' : 'Ask about commissioning procedures, risks, or next steps...'}
            rows={1}
            value={content}
          />
        </div>
        <button
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50"
          disabled={(!content.trim() && attachments.length === 0) || sending || disabled}
          type="submit"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  )
}
