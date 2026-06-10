import { motion } from 'framer-motion'

export type ViewMode = 'raw' | 'structured' | 'consensus' | 'conflict'

const modes: { key: ViewMode; label: string; description: string }[] = [
  { key: 'raw', label: 'Raw', description: 'Show all provider responses as-is' },
  { key: 'structured', label: 'Structured', description: 'Organized comparison with agreements, risks & insights' },
  { key: 'consensus', label: 'Consensus', description: 'Only points where providers agree' },
  { key: 'conflict', label: 'Conflict', description: 'Only disagreements and contradictions' },
]

interface ModeToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl bg-card/50 p-1 ring-1 ring-border">
      {modes.map((mode) => (
        <button
          key={mode.key}
          className={`relative rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
            value === mode.key
              ? 'text-foreground'
              : 'text-subtle hover:text-muted-foreground'
          }`}
          onClick={() => onChange(mode.key)}
          title={mode.description}
        >
          {value === mode.key && (
            <motion.div
              className="absolute inset-0 rounded-xl bg-muted"
              layoutId="mode-pill"
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          )}
          <span className="relative z-10">{mode.label}</span>
        </button>
      ))}
    </div>
  )
}
