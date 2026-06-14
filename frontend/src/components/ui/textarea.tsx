import * as React from 'react'

import { cn } from '@/lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'min-h-[140px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-subtle focus-visible:border-emerald-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20',
          className,
        )}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'
