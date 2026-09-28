/*
  Sign in.

  The password is never the whole story. Unless this browser has been trusted
  before, signing in only gets you as far as an emailed code:

    trusted device -> 200 with a token, straight to the app.
    otherwise      -> 202, no token, a code is on its way -> /verify.

  "Remember me" is what earns that trust. Ticked, the session and the device
  token go to localStorage and survive a restart. Unticked, both go to
  sessionStorage, so closing the browser loses them and the next sign-in needs a
  code again - which is exactly the behaviour the checkbox promises.

  The one non-obvious case: an account that never used its FIRST code gets a 403
  with code EMAIL_NOT_VERIFIED before any of this. Showing that as an error would
  be a dead end, so it redirects to the code screen and triggers a fresh code.

  HIDDEN SIGN-IN
  --------------
  Ctrl+Alt+M turns this page into the moderator sign-in and Ctrl+Alt+A into the
  admin sign-in (see useSecretKeybind). Nothing on the page hints that they
  exist. The same form is sent with a `mode`; the backend refuses it, with the
  ordinary "Invalid email or password", unless the account holds that role.
*/

import { zodResolver } from '@hookform/resolvers/zod'
import { Crown, ShieldCheck } from '@phosphor-icons/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { Seo } from '@/components/seo/Seo'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { PasswordField } from '@/components/auth/PasswordField'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { TextField } from '@/components/ui/TextField'
import { takeSuspendedNotice } from '@/lib/accountEvents'
import { authApi } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { loginSchema } from '@/lib/schemas'
import type { LoginValues } from '@/lib/schemas'
import { readDeviceToken } from '@/lib/session'
import { useSecretKeybind } from '@/lib/useSecretKeybind'
import type { SecretMode } from '@/lib/useSecretKeybind'

const MODE_COPY: Record<SecretMode, { title: string; subtitle: string; badge: string }> = {
  MODERATOR: {
    title: 'Moderator sign-in',
    subtitle: 'Sign in with your own account to open a moderator session.',
    badge: 'Moderator',
  },
  ADMIN: {
    title: 'Admin sign-in',
    subtitle: 'Sign in with your own account to open an admin session.',
    badge: 'Admin',
  },
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [mode, setMode] = useState<SecretMode | null>(null)
  // Set when the app signed the student out because their account was suspended.
  const [suspended] = useState(takeSuspendedNotice)

  // Pressing the same combination again goes back to the normal sign-in.
  useSecretKeybind((pressed) => {
    setFormError(null)
    setMode((current) => (current === pressed ? null : pressed))
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  })

  const requested = (location.state as { from?: string } | null)?.from ?? '/feed'
  const from = mode ? '/moderation' : requested

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    // An elevated session is always short-lived, so "Remember me" does not apply.
    const rememberMe = mode ? false : values.rememberMe
    try {
      const result = await authApi.login({
        email: values.email,
        password: values.password,
        deviceToken: readDeviceToken(),
        rememberMe,
        mode: mode ?? undefined,
      })

      // A token means the backend recognised this browser and skipped the code.
      if ('token' in result) {
        signIn(result, rememberMe)
        navigate(from, { replace: true })
        return
      }

      /*
        No token: a code has just been sent. autoResend must stay false here -
        login already sent one, and asking for another within the backend's 60s
        cooldown would greet the student with an error on arrival.
      */
      navigate('/verify', {
        replace: true,
        state: {
          email: values.email,
          rememberMe,
          from,
          autoResend: false,
          mode: mode ?? undefined,
          loginTicket: result.loginTicket ?? undefined,
        },
      })
    } catch (error) {
      if (error instanceof ApiError && error.isUnverified) {
        navigate('/verify', {
          replace: true,
          state: { email: values.email, rememberMe, from, autoResend: true },
        })
        return
      }
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      )
    }
  })

  const copy = mode ? MODE_COPY[mode] : null
  const ModeIcon = mode === 'ADMIN' ? Crown : ShieldCheck

  return (
    <AuthLayout
      title={copy?.title ?? 'Welcome back'}
      subtitle={copy?.subtitle ?? 'Sign in to your UniExchange account.'}
      footer={
        mode ? (
          <button
            type="button"
            onClick={() => setMode(null)}
            className="rounded font-semibold text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Back to the normal sign-in
          </button>
        ) : (
          <>
            New here?{' '}
            <Link to="/signup" className="rounded font-semibold text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
              Create an account
            </Link>
          </>
        )
      }
    >
      <Seo
        title="Log in"
        description="Sign in to UniExchange, the verified marketplace for CPUT students and staff."
        path="/login"
      />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {copy && (
          <div
            className={`flex items-center gap-3 rounded-xl p-3 text-sm ${
              mode === 'ADMIN' ? 'bg-amber-50 text-amber-800' : 'bg-brand-50 text-brand-800'
            }`}
          >
            <ModeIcon aria-hidden="true" className="size-5 shrink-0" weight="duotone" />
            <p className="min-w-0 flex-1">
              Your powers switch on for this session only, and it ends after an hour.
            </p>
            <Badge tone={mode === 'ADMIN' ? 'warning' : 'brand'}>{copy.badge}</Badge>
          </div>
        )}

        {suspended && !formError && (
          <Alert>Your account has been suspended. Contact campus support if you think this is a mistake.</Alert>
        )}
        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="CPUT email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="240453182@mycput.ac.za"
          hint={mode ? undefined : 'Students use @mycput.ac.za, staff use @cput.ac.za.'}
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        {!mode && (
          <Checkbox
            label="Remember me on this device"
            hint="Stay signed in and skip the emailed code next time. Leave this off on a shared or campus computer."
            {...register('rememberMe')}
          />
        )}

        <Button type="submit" loading={isSubmitting}>
          {copy ? `Open ${copy.badge.toLowerCase()} session` : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
