import * as React from 'react'

import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, type, ...props }, ref) => {
    return (
      <input
        className={cn(
          'flex h-10 w-full rounded-xl border bg-card px-3 py-2 text-sm text-foreground placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50',
          hasError
            ? 'border-red-500 focus-visible:ring-red-400'
            : 'border-border',
          className,
        )}
        ref={ref}
        type={type}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
