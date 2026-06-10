import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  FileSearch,
  GitCompareArrows,
  RadioTower,
  ShieldCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const providerPanels = [
  {
    accent: 'from-emerald-400 to-teal-300',
    name: 'ChatGPT',
    status: 'Queued for shared context',
  },
  {
    accent: 'from-violet-400 to-fuchsia-300',
    name: 'Claude',
    status: 'Ready for parallel dispatch',
  },
  {
    accent: 'from-sky-400 to-cyan-300',
    name: 'Gemini',
    status: 'Failure-isolated stream',
  },
]

const architectureCards = [
  {
    description:
      'One normalized context envelope feeds all enabled providers with matching prompts, history, notes, and attachment references.',
    icon: GitCompareArrows,
    title: 'Identical Context',
  },
  {
    description:
      'Provider calls run independently so one quota, outage, or timeout never blocks the rest of the investigation.',
    icon: RadioTower,
    title: 'Parallel Orchestration',
  },
  {
    description:
      'Comparisons focus on agreements, disagreements, unique insights, hidden risks, and next investigations.',
    icon: FileSearch,
    title: 'Structured Analysis',
  },
  {
    description:
      'Provider keys, attachments, and investigation history are designed around encryption, redaction, and user scoping.',
    icon: ShieldCheck,
    title: 'Security First',
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-12rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[140px]" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/25">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">2oo3</p>
              <p className="text-xs text-zinc-500">Milestone 1 scaffold</p>
            </div>
          </div>
          <a
            className="hidden text-sm text-zinc-400 transition-all duration-300 hover:text-zinc-50 sm:block"
            href="/docs"
          >
            API docs at :3000/docs
          </a>
        </header>

        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1fr_0.9fr] lg:py-20">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Architecture alignment
            </div>
            <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Multi-model confidence for{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-white to-cyan-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]">
                commissioning investigations
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              A production-ready foundation for side-by-side AI analysis,
              identical shared context, persistent investigations, and
              structured comparison of engineering blind spots.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg">
                Start local scaffold
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary">
                Review architecture
              </Button>
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
            initial={{ opacity: 0, scale: 0.96 }}
            transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
          >
            <Card className="overflow-hidden border-white/10 bg-white/[0.04] shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                      Provider fan-out preview
                    </p>
                    <CardTitle className="mt-2 text-2xl">
                      Shared turn dispatch
                    </CardTitle>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {providerPanels.map((panel, index) => (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 transition-all duration-300 hover:border-emerald-300/30 hover:bg-zinc-900/70"
                    initial={{ opacity: 0, x: 20 }}
                    key={panel.name}
                    transition={{ delay: 0.25 + index * 0.08 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{panel.name}</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {panel.status}
                        </p>
                      </div>
                      <div
                        className={`h-2.5 w-16 rounded-full bg-gradient-to-r ${panel.accent}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 pb-8 md:grid-cols-2 lg:grid-cols-4"
          initial={{ opacity: 0, y: 24 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {architectureCards.map((item) => {
            const Icon = item.icon

            return (
              <Card
                className="group border-white/10 bg-white/[0.03] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/30 hover:bg-white/[0.06]"
                key={item.title}
              >
                <CardHeader>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 transition-all duration-300 group-hover:bg-emerald-400/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-zinc-400">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>
      </section>
    </main>
  )
}
