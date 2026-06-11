import { useCallback } from 'react'

import { api } from '@/lib/api'

export function useAnalytics() {
  const track = useCallback(
    async (event: string, properties?: Record<string, unknown>) => {
      try {
        await api.post('/analytics/track', { event, properties })
      } catch {
        // Analytics failures are non-critical — silently ignore
      }
    },
    [],
  )

  return { track }
}
