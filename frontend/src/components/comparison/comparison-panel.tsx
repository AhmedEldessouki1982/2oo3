import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, Lightbulb, Search, AlertOctagon } from 'lucide-react'

import type { ComparisonResult, ComparisonSection } from '@/lib/api'
import { Spinner } from '@/components/ui/spinner'
import type { ViewMode } from './mode-toggle'

interface ComparisonPanelProps {
  result: ComparisonResult | null
  loading: boolean
  mode: ViewMode
}

const sectionIcons: Record<string, React.ReactNode> = {
  agreements: <CheckCircle className="h-4 w-4 text-emerald-400" />,
  disagreements: <AlertOctagon className="h-4 w-4 text-amber-400" />,
  uniqueInsights: <Lightbulb className="h-4 w-4 text-blue-400" />,
  hiddenRisks: <AlertTriangle className="h-4 w-4 text-red-400" />,
  nextInvestigations: <Search className="h-4 w-4 text-violet-400" />,
}

const sectionThemes: Record<string, {
  border: string
  bg: string
  header: string
  badge: string
}> = {
  agreements: {
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/[0.03]',
    header: 'text-emerald-300',
    badge: 'bg-emerald-500/10 text-emerald-300',
  },
  disagreements: {
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/[0.03]',
    header: 'text-amber-300',
    badge: 'bg-amber-500/10 text-amber-300',
  },
  uniqueInsights: {
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/[0.03]',
    header: 'text-blue-300',
    badge: 'bg-blue-500/10 text-blue-300',
  },
  hiddenRisks: {
    border: 'border-red-500/20',
    bg: 'bg-red-500/[0.03]',
    header: 'text-red-300',
    badge: 'bg-red-500/10 text-red-300',
  },
  nextInvestigations: {
    border: 'border-violet-500/20',
    bg: 'bg-violet-500/[0.03]',
    header: 'text-violet-300',
    badge: 'bg-violet-500/10 text-violet-300',
  },
}

function severityClass(severity?: string): string {
  switch (severity) {
    case 'critical':
      return 'border-l-2 border-l-red-500 bg-red-500/[0.04]'
    case 'warning':
      return 'border-l-2 border-l-amber-500 bg-amber-500/[0.04]'
    default:
      return 'border-l-2 border-l-zinc-700'
  }
}

function SectionCard({
  section,
  theme,
  icon,
}: {
  section: ComparisonSection
  theme: typeof sectionThemes[string]
  icon: React.ReactNode
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${theme.border} ${theme.bg} overflow-hidden`}
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
    >
      <div className={`flex items-center justify-between border-b ${theme.border} px-4 py-2.5`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className={`text-sm font-semibold ${theme.header}`}>{section.title}</span>
        </div>
        {section.severity && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${theme.badge}`}>
            {section.severity}
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        {section.findings.map((finding, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm text-card-foreground ${severityClass(section.severity)}`}
          >
            {finding}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function ComparisonPanel({ result, loading, mode }: ComparisonPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6 text-emerald-400" />
      </div>
    )
  }

  if (!result || result.status === 'FAILED') {
    return null
  }

  const sections: { key: string; data: ComparisonSection[]; icon: React.ReactNode }[] = []

  if (mode === 'structured' || mode === 'consensus') {
    if (result.agreements.length > 0) {
      sections.push({
        key: 'agreements',
        data: result.agreements,
        icon: sectionIcons.agreements,
      })
    }
  }

  if (mode === 'structured' || mode === 'conflict') {
    if (result.disagreements.length > 0) {
      sections.push({
        key: 'disagreements',
        data: result.disagreements,
        icon: sectionIcons.disagreements,
      })
    }
  }

  if (mode === 'structured') {
    if (result.risks.length > 0) {
      sections.push({
        key: 'hiddenRisks',
        data: result.risks,
        icon: sectionIcons.hiddenRisks,
      })
    }
    if (result.uniqueInsights.length > 0) {
      sections.push({
        key: 'uniqueInsights',
        data: result.uniqueInsights,
        icon: sectionIcons.uniqueInsights,
      })
    }
    if (result.nextInvestigations.length > 0) {
      sections.push({
        key: 'nextInvestigations',
        data: result.nextInvestigations,
        icon: sectionIcons.nextInvestigations,
      })
    }
  }

  if (sections.length === 0) {
    return null
  }

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-subtle">
            Comparison Analysis
          </span>
        </div>
        {sections.map(({ key, data, icon }) => {
          const theme = sectionThemes[key] ?? sectionThemes.agreements
          return (
            <div key={key} className="space-y-2">
              {data.map((section, i) => (
                <SectionCard key={`${key}-${i}`} section={section} theme={theme} icon={icon} />
              ))}
            </div>
          )
        })}
      </motion.div>
    </AnimatePresence>
  )
}
