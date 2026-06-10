import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, X, AlertCircle, Info, XCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toastIcons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
  error: <XCircle className="h-5 w-5 text-red-400" />,
  info: <Info className="h-5 w-5 text-blue-400" />,
  warning: <AlertCircle className="h-5 w-5 text-amber-400" />,
}

const toastBorders: Record<ToastType, string> = {
  success: 'border-emerald-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
  warning: 'border-amber-500/30',
}

const toastGlows: Record<ToastType, string> = {
  success: 'shadow-emerald-500/10',
  error: 'shadow-red-500/10',
  info: 'shadow-blue-500/10',
  warning: 'shadow-amber-500/10',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, title, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-end gap-3 p-4 sm:p-6">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border ${toastBorders[toast.type]} bg-zinc-900/95 px-4 py-3 shadow-xl ${toastGlows[toast.type]} backdrop-blur-xl`}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              layout
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="mt-0.5 shrink-0">{toastIcons[toast.type]}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-100">{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 text-xs text-zinc-400">{toast.message}</p>
                )}
              </div>
              <button
                className="shrink-0 rounded-lg p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                onClick={() => dismiss(toast.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
