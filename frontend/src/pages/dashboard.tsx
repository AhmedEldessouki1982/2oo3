import { motion } from 'framer-motion'
import { Bot, Wrench } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome back, {user?.displayName}
        </h1>
        <p className="mt-2 text-zinc-400">
          Your investigation workspace is coming in Milestone 4
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <Bot className="h-5 w-5" />
              </div>
              <CardTitle>Active investigations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-300">0</p>
            <p className="mt-1 text-sm text-zinc-500">No active conversations</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Wrench className="h-5 w-5" />
              </div>
              <CardTitle>Available providers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-300">0</p>
            <p className="mt-1 text-sm text-zinc-500">
              No keys configured yet
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
