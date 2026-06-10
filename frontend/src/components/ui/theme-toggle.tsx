import { Moon, Sun } from 'lucide-react'

import { useTheme } from '@/contexts/theme-context'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  )
}
