import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormError } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type ForgotForm = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  async function onSubmit(_data: ForgotForm) {
    void _data
    // Placeholder — no backend endpoint yet
    await new Promise((r) => setTimeout(r, 1000))
    setSubmitted(true)
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <p className="mt-2 text-sm text-zinc-400">
          Enter your email and we'll send instructions
        </p>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-6 text-center text-sm text-emerald-300">
            If that email is registered, we'll send instructions.
          </div>
        ) : (
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

            <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
              <Mail className="h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Send instructions'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-zinc-500">
          Remember your password?{' '}
          <Link className="text-emerald-300 hover:text-emerald-200" to="/login">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
