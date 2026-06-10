import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-12rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[140px]" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <Outlet />
      </div>
    </main>
  )
}
