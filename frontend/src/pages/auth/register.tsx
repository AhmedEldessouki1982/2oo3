import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'

const registerSchema = z
  .object({
    displayName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/(?=.*[a-z])/, 'Password must contain a lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Password must contain an uppercase letter')
      .regex(/(?=.*\d)/, 'Password must contain a number')
      .regex(/(?=.*[!@#$%^&*])/, 'Password must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterForm) {
    try {
      await registerUser(data.email, data.password, data.displayName)
      showToast('success', 'Account created', 'Welcome to 2oo3! You are now signed in.')
      navigate('/dashboard')
    } catch (err) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message?.message ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.message ||
        'Registration failed. Please try again.'
      showToast('error', 'Registration failed', typeof message === 'string' ? message : 'Please check your details and try again.')
    }
  }

  return (
    <Card className="border-glass-border bg-glass shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Join the commissioning investigation workspace
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="displayName">Full name</Label>
            <Input
              hasError={!!errors.displayName}
              id="displayName"
              placeholder="Nadia Hassan"
              type="text"
              {...register('displayName')}
            />
            <FormError message={errors.displayName?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              hasError={!!errors.email}
              id="email"
              placeholder="engineer@example.com"
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
                placeholder="Min. 8 chars, uppercase, lowercase, number, special"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              hasError={!!errors.confirmPassword}
              id="confirmPassword"
              placeholder="Repeat your password"
              type="password"
              {...register('confirmPassword')}
            />
            <FormError message={errors.confirmPassword?.message} />
          </div>

          <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
            {isSubmitting ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-subtle">
          Already have an account?{' '}
          <Link className="text-emerald-300 hover:text-emerald-200" to="/login">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
