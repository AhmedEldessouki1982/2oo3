import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Check,
  Clock,
  Eye,
  FileText,
  Plus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react'

import {
  createRoutine,
  deleteRoutine,
  listRoutines,
  updateRoutine,
  type Routine,
} from '@/lib/api'

const SCHEDULE_LABELS: Record<string, string> = {
  HOURLY: 'Hourly',
  DAILY: 'Daily',
}

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSchedule, setFormSchedule] = useState<'HOURLY' | 'DAILY'>('DAILY')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSchedule, setEditSchedule] = useState<'HOURLY' | 'DAILY'>('DAILY')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const loadRoutines = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listRoutines()
      setRoutines(data)
    } catch {
      setError('Failed to load routines')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoutines()
  }, [loadRoutines])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim() || !formDescription.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createRoutine(formName.trim(), formDescription.trim(), formSchedule)
      setFormName('')
      setFormDescription('')
      setFormSchedule('DAILY')
      setShowForm(false)
      await loadRoutines()
    } catch {
      setError('Failed to create routine')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      await deleteRoutine(id)
      setOpenMenuId(null)
      await loadRoutines()
    } catch {
      setError('Failed to delete routine')
    }
  }

  async function handleToggleActive(routine: Routine) {
    setError(null)
    try {
      await updateRoutine(routine.id, { active: !routine.active })
      setOpenMenuId(null)
      await loadRoutines()
    } catch {
      setError('Failed to update routine')
    }
  }

  function startEdit(routine: Routine) {
    setEditingId(routine.id)
    setEditName(routine.name)
    setEditDescription(routine.description)
    setEditSchedule(routine.schedule)
    setOpenMenuId(null)
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim() || !editDescription.trim()) return
    setError(null)
    try {
      await updateRoutine(id, {
        name: editName.trim(),
        description: editDescription.trim(),
        schedule: editSchedule,
      })
      setEditingId(null)
      await loadRoutines()
    } catch {
      setError('Failed to update routine')
    }
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Routines
          </h1>
          <p className="mt-2 text-muted-foreground">
            Schedule automated Big Pickle responses to run hourly or daily.
            Define what you want the model to tell you, and it'll deliver on
            repeat.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-500/20 transition-all hover:from-lime-400 hover:to-emerald-400"
          onClick={() => setShowForm((p) => !p)}
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'New Routine'}
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {showForm && (
        <motion.form
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border border-border bg-card/50 p-6"
          initial={{ opacity: 0, y: -8 }}
          onSubmit={handleCreate}
        >
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">
            Create Routine
          </h2>
          <div className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-foreground"
                htmlFor="name"
              >
                Name
              </label>
              <input
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-subtle outline-none transition-colors focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20"
                id="name"
                placeholder="e.g. Morning commissioning report"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-foreground"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                className="min-h-[100px] w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-subtle outline-none transition-colors focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20"
                id="description"
                placeholder="Tell Big Pickle what to generate — this is the prompt it will use every run. e.g. Summarize today's GT-1 commissioning progress, flag any schedule risks, and give me the top 3 priorities for the next shift."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-4">
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-foreground"
                  htmlFor="schedule"
                >
                  Schedule
                </label>
                <div className="flex gap-1.5">
                  {(['DAILY', 'HOURLY'] as const).map((s) => (
                    <button
                      key={s}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                        formSchedule === s
                          ? 'bg-lime-500/15 text-lime-300 ring-1 ring-lime-500/30'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      type="button"
                      onClick={() => setFormSchedule(s)}
                    >
                      <Clock className="mr-1.5 inline-block h-3.5 w-3.5" />
                      {SCHEDULE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-500/20 transition-all hover:from-lime-400 hover:to-emerald-400 disabled:opacity-50"
                disabled={!formName.trim() || !formDescription.trim() || saving}
                type="submit"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Create
              </button>
            </div>
          </div>
        </motion.form>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
        </div>
      ) : routines.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/30 px-6 py-16 text-center">
          <Clock className="mx-auto mb-4 h-10 w-10 text-subtle" />
          <p className="text-lg font-medium text-card-foreground">
            No routines yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first routine to start receiving automated Big Pickle
            responses.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {routines.map((routine, idx) => (
            <motion.div
              key={routine.id}
              animate={{ opacity: 1, y: 0 }}
              className={`group relative rounded-2xl border p-5 transition-all ${
                routine.active
                  ? 'border-lime-500/20 bg-lime-500/[0.03]'
                  : 'border-border bg-card/30 opacity-60'
              }`}
              initial={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  {editingId === routine.id ? (
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    <h3 className="text-base font-semibold text-card-foreground">
                      {routine.name}
                    </h3>
                  )}
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      routine.schedule === 'HOURLY'
                        ? 'bg-cyan-500/10 text-cyan-300'
                        : 'bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {SCHEDULE_LABELS[routine.schedule]}
                  </span>
                </div>

                <div className="relative" ref={menuRef}>
                  <button
                    className="rounded-lg p-1.5 text-subtle opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === routine.id ? null : routine.id,
                      )
                    }
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {openMenuId === routine.id && (
                    <div className="absolute right-0 top-8 z-50 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                      {routine.lastResponse && (
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-card-foreground transition-colors hover:bg-muted"
                          onClick={() => {
                            setExpandedResultId(
                              expandedResultId === routine.id
                                ? null
                                : routine.id,
                            )
                            setOpenMenuId(null)
                          }}
                        >
                          <Eye className="h-4 w-4 text-subtle" />
                          View Result
                        </button>
                      )}
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-card-foreground transition-colors hover:bg-muted"
                        onClick={() => startEdit(routine)}
                      >
                        <Pencil className="h-4 w-4 text-subtle" />
                        Edit
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-card-foreground transition-colors hover:bg-muted"
                        onClick={() => handleToggleActive(routine)}
                      >
                        <Play className="h-4 w-4 text-subtle" />
                        {routine.active ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                        onClick={() => handleDelete(routine.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {editingId === routine.id ? (
                <div className="space-y-3">
                  <textarea
                    className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    {(['DAILY', 'HOURLY'] as const).map((s) => (
                      <button
                        key={s}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          editSchedule === s
                            ? 'bg-lime-500/15 text-lime-300 ring-1 ring-lime-500/30'
                            : 'bg-muted text-muted-foreground'
                        }`}
                        type="button"
                        onClick={() => setEditSchedule(s)}
                      >
                        {SCHEDULE_LABELS[s]}
                      </button>
                    ))}
                    <button
                      className="ml-auto rounded-lg bg-lime-500/15 px-4 py-1.5 text-xs font-medium text-lime-300 transition-colors hover:bg-lime-500/25"
                      onClick={() => handleSaveEdit(routine.id)}
                    >
                      Save
                    </button>
                    <button
                      className="rounded-lg bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
                    {routine.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-subtle">
                    {routine.active ? (
                      <span className="flex items-center gap-1 text-lime-400/60">
                        <RefreshCw className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400/60">
                        <AlertCircle className="h-3 w-3" />
                        Paused
                      </span>
                    )}
                    {routine.lastRunAt && (
                      <span>
                        Last run: {new Date(routine.lastRunAt).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {expandedResultId === routine.id && routine.lastResponse && (
                    <div className="mt-3 rounded-xl border border-lime-500/15 bg-lime-500/[0.02] p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-lime-400">
                        <FileText className="h-3.5 w-3.5" />
                        Last response
                      </div>
                      <div className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-card-foreground">
                        {routine.lastResponse}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
