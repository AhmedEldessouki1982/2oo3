import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    try {
      await login(data.email, data.password)
      showToast('success', 'Welcome back', 'You have been signed in successfully.')
      navigate('/dashboard')
    } catch (err) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message?.message ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.message ||
        'Invalid email or password. Please try again.'
      showToast('error', 'Sign in failed', typeof message === 'string' ? message : 'Invalid email or password.')
    }
  }

  return (
    <Card className="border-glass-border bg-glass shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Secure access to your investigation workspace
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              hasError={!!errors.email}
              id="email"
              placeholder="lead.commissioning@example.com"
              type="email"
              {...register('email')}
            />
            <FormError message={errors.email?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                hasError={!!errors.password}
                id="password"
                placeholder="Enter your password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                type="button"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <FormError message={errors.password?.message} />
          </div>

          <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
            {isSubmitting ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-subtle">
          <Link className="text-emerald-300 hover:text-emerald-200" to="/register">
            Create an account
          </Link>
          <Link className="text-emerald-300 hover:text-emerald-200" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
