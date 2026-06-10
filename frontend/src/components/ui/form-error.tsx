import { cn } from '@/lib/utils'

export function FormError({ className, message }: { className?: string; message?: string }) {
  if (!message) return null
  return (
    <p className={cn('mt-1 text-xs text-red-400', className)} role="alert">
      {message}
    </p>
  )
}
