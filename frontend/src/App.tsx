import { Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthProvider } from '@/contexts/auth-context'
import { ToastProvider } from '@/contexts/toast-context'
import { AppShell } from '@/layouts/app-shell'
import { AuthLayout } from '@/layouts/auth-layout'
import DashboardPage from '@/pages/dashboard'
import ForgotPasswordPage from '@/pages/auth/forgot-password'
import LandingPage from '@/pages/landing'
import LoginPage from '@/pages/auth/login'
import RegisterPage from '@/pages/auth/register'
import ChatWorkspacePage from '@/pages/chat/chat-workspace'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route element={<LandingPage />} path="/" />
          <Route element={<AuthLayout />}>
            <Route element={<LoginPage />} path="/login" />
            <Route element={<RegisterPage />} path="/register" />
            <Route element={<ForgotPasswordPage />} path="/forgot-password" />
          </Route>
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route element={<DashboardPage />} path="/dashboard" />
            <Route element={<ChatWorkspacePage />} path="/app/conversations/:conversationId" />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
