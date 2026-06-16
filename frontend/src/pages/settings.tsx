import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  ShieldAlert,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'

import { useAnalytics } from '@/hooks/use-analytics'
import {
  checkCredentialHealth,
  createCredential,
  deleteCredential,
  listCredentials,
  toggleCredential,
  updateCredential,
  type ProviderCredential,
  type ProviderHealth,
} from '@/lib/api'

const PROVIDER_INFO: Record<string, { name: string; color: string; docs: string }> = {
  OPENAI: { name: 'OpenAI (ChatGPT)', color: 'emerald', docs: 'https://platform.openai.com/api-keys' },
  ANTHROPIC: { name: 'Anthropic (Claude)', color: 'amber', docs: 'https://console.anthropic.com/settings/keys' },
  GOOGLE: { name: 'Google (Gemini)', color: 'cyan', docs: 'https://aistudio.google.com/app/apikey' },
  BIG_PICKLE: { name: 'Big Pickle', color: 'lime', docs: 'https://aistudio.google.com/app/apikey' },
}

export default function SettingsPage() {
  const { track } = useAnalytics()
  const [credentials, setCredentials] = useState<ProviderCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [healthMap, setHealthMap] = useState<Record<string, ProviderHealth>>({})
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const loadCredentials = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const creds = await listCredentials()
      setCredentials(creds)

      const healthResults = await Promise.allSettled(
        ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'BIG_PICKLE'].map((p) => checkCredentialHealth(p)),
      )
      const health: Record<string, ProviderHealth> = {}
      for (const result of healthResults) {
        if (result.status === 'fulfilled') {
          health[result.value.provider] = result.value
        }
      }
      setHealthMap(health)
    } catch {
      setError('Failed to load provider settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCredentials()
  }, [loadCredentials])

  const credentialFor = (provider: string) =>
    credentials.find((c) => c.provider === provider)

  async function handleSave(provider: string) {
    const apiKey = keyInputs[provider]?.trim()
    if (!apiKey) return

    setSaving((prev) => ({ ...prev, [provider]: true }))
    setError(null)
    try {
      const existing = credentialFor(provider)
      if (existing) {
        await updateCredential(provider, apiKey)
      } else {
        await createCredential(provider, apiKey)
      }
      setKeyInputs((prev) => ({ ...prev, [provider]: '' }))
      await loadCredentials()
      track('provider_configured', { provider })
    } catch {
      setError(`Failed to save ${PROVIDER_INFO[provider]?.name ?? provider} key`)
    } finally {
      setSaving((prev) => ({ ...prev, [provider]: false }))
    }
  }

  async function handleToggle(provider: string) {
    setError(null)
    const wasEnabled = credentialFor(provider)?.enabled
    try {
      await toggleCredential(provider)
      await loadCredentials()
      track('provider_toggled', { provider, enabled: !wasEnabled })
    } catch {
      setError(`Failed to toggle ${provider}`)
    }
  }

  async function handleDelete(provider: string) {
    setError(null)
    try {
      await deleteCredential(provider)
      setKeyInputs((prev) => ({ ...prev, [provider]: '' }))
      await loadCredentials()
      track('provider_key_deleted', { provider })
    } catch {
      setError(`Failed to delete ${provider} key`)
    }
  }

  const providers = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'BIG_PICKLE']

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Provider Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your AI provider API keys. Keys are encrypted at rest and never exposed to the frontend after save.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {providers.map((provider, idx) => {
            const info = PROVIDER_INFO[provider]
            const cred = credentialFor(provider)
            const health = healthMap[provider]
            const showKey = showKeys[provider]
            const isSaving = saving[provider]
            const keyValue = keyInputs[provider] ?? ''

            return (
              <motion.div
                key={provider}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card/50 p-6"
                initial={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${info.color}-400/10 text-${info.color}-300`}
                    >
                      <Key className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-card-foreground">{info.name}</h2>
                      <a
                        className="text-xs text-subtle underline-offset-2 hover:text-muted-foreground hover:underline"
                        href={info.docs}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Get API key
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {health && (
                      <div className="flex items-center gap-1.5 text-xs">
                        {health.healthy ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Connected</span>
                          </>
                        ) : health.configured ? (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                            <span className="text-red-400">Unhealthy</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-3.5 w-3.5 text-subtle" />
                            <span className="text-subtle">Not configured</span>
                          </>
                        )}
                      </div>
                    )}

                    {cred && (
                      <button
                        className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => handleDelete(provider)}
                        title={`Remove ${info.name} key`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm text-foreground placeholder-subtle outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                      placeholder={
                        cred
                          ? `Replace existing key (starts with ${cred.keyFingerprint ? cred.keyFingerprint.slice(0, 8) + '...' : '...'})`
                          : `Paste your ${info.name} API key`
                      }
                      type={showKey ? 'text' : 'password'}
                      value={keyValue}
                      onChange={(e) =>
                        setKeyInputs((prev) => ({ ...prev, [provider]: e.target.value }))
                      }
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground"
                      onClick={() =>
                        setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
                      }
                      type="button"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <button
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50"
                    disabled={!keyValue.trim() || isSaving}
                    onClick={() => handleSave(provider)}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {cred ? 'Update' : 'Save'}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-subtle">
                  {cred && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400/60" />
                      Key saved
                      {cred.enabled ? (
                        <span className="ml-1 flex items-center gap-1 text-emerald-400/60">
                          <Wifi className="h-3 w-3" /> Enabled
                        </span>
                      ) : (
                        <span className="ml-1 flex items-center gap-1 text-amber-400/60">
                          <ShieldAlert className="h-3 w-3" /> Disabled
                        </span>
                      )}
                    </span>
                  )}
                  {cred && (
                    <button
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                        cred.enabled
                          ? 'text-amber-400/60 hover:bg-amber-500/10 hover:text-amber-400'
                          : 'text-emerald-400/60 hover:bg-emerald-500/10 hover:text-emerald-400'
                      }`}
                      onClick={() => handleToggle(provider)}
                    >
                      {cred.enabled ? (
                        <>
                          <WifiOff className="h-3 w-3" /> Disable
                        </>
                      ) : (
                        <>
                          <Wifi className="h-3 w-3" /> Enable
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-border bg-card/30 p-4">
        <div className="flex items-start gap-3 text-xs text-subtle">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            API keys are encrypted at rest using AES-256-GCM and are never sent to the frontend. 
            Health checks ping provider endpoints to validate connectivity without exposing the key. 
            Credential events are logged for audit purposes.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
