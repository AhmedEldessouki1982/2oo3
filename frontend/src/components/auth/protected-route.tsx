import { Navigate } from 'react-router-dom'

import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/auth-context'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/" />
  }

  return <>{children}</>
}
