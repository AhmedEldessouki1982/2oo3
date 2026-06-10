import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import {
  clearTokens,
  getMeApi,
  loginApi,
  logoutApi,
  registerApi,
  setTokens,
  getRefreshToken,
} from '@/lib/api'

export interface User {
  id: string
  email: string
  displayName: string
  role: string
  createdAt: string
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function refreshUser() {
    try {
      const data = await getMeApi()
      setUser(data)
    } catch {
      setUser(null)
      clearTokens()
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setIsLoading(false)
      return
    }
    refreshUser().finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const data = await loginApi(email, password)
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
  }

  async function register(email: string, password: string, displayName: string) {
    const data = await registerApi(email, password, displayName)
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
  }

  async function logout() {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        await logoutApi(refreshToken)
      }
    } catch {
      // ignore errors on logout
    }
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
