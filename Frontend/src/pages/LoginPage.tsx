/*
  Sign in.

  The one non-obvious case: an unverified account gets a 403 with
  code EMAIL_NOT_VERIFIED. Showing that as an error would be a dead end, so it
  redirects to the code screen and triggers a fresh code instead.
*/

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { Alert } from '@/components/ui/Alert'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { authApi } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { loginSchema } from '@/lib/schemas'
import type { LoginValues } from '@/lib/schemas'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const from = (location.state as { from?: string } | null)?.from ?? '/feed'

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      signIn(await authApi.login(values))
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.isUnverified) {
        navigate('/verify', {
          replace: true,
          state: { email: values.email, autoResend: true },
        })
        return
      }
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      )
    }
  })

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your UniExchange account."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="Student email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="240453182@mycput.ac.za"
          error={errors.email?.message}
          {...register('email')}
        />

        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
