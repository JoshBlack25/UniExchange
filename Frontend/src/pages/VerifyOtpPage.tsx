/*
  The verification step. This is where an account actually becomes usable:
  /verify-otp is the only endpoint that issues a token, so a made-up student
  number stops here permanently.

  Reachable three ways - router state from signup, a ?email= query param, or a
  redirect from login when the account is unverified - so closing the tab does
  not strand anyone.
*/

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { Alert } from '@/components/Alert'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/Button'
import { OtpInput } from '@/components/OtpInput'
import { api, ApiError } from '@/lib/api'

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60

type LocationState = { email?: string; autoResend?: boolean } | null

export function VerifyOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { signIn } = useAuth()

  const state = location.state as LocationState
  const email = (state?.email ?? searchParams.get('email') ?? '').toLowerCase()

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Login redirects here with autoResend when the account is unverified, so the
  // student gets a fresh code without having to ask for one.
  const autoResendDone = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const submit = async (submittedCode: string) => {
    if (submittedCode.length !== CODE_LENGTH || submitting) return

    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      const response = await api.verifyOtp({ email, code: submittedCode })
      signIn(response)
      navigate('/dashboard', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not verify that code.')
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  const resend = async () => {
    setError(null)
    setNotice(null)
    try {
      const response = await api.resendOtp({ email })
      setNotice(response.message)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not send a new code.')
      // The backend enforces the same cooldown, so reflect it either way.
      setCooldown(RESEND_COOLDOWN_SECONDS)
    }
  }

  useEffect(() => {
    if (!email || !state?.autoResend || autoResendDone.current) return
    autoResendDone.current = true
    void resend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, state?.autoResend])

  if (!email) {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle="We need to know which account to verify."
        footer={
          <Link to="/signup" className="font-medium text-brand-700 hover:underline">
            Back to sign up
          </Link>
        }
      >
        <Alert>
          Open the link from your signup, or start again so we can send a new code.
        </Alert>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Enter your code"
      subtitle={
        <>
          We sent a {CODE_LENGTH}-digit code to <span className="font-medium text-ink-700">{email}</span>.
          It expires in 10 minutes.
        </>
      }
      footer={
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(code)
        }}
      >
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}

        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={(complete) => void submit(complete)}
          disabled={submitting}
          invalid={error !== null}
        />

        <Button type="submit" loading={submitting} disabled={code.length !== CODE_LENGTH}>
          Verify and continue
        </Button>

        <div className="text-center text-sm text-ink-500">
          Didn&apos;t get it?{' '}
          <button
            type="button"
            onClick={() => void resend()}
            disabled={cooldown > 0}
            className="font-medium text-brand-700 hover:underline disabled:text-ink-400 disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new code'}
          </button>
          <p className="mt-1 text-xs text-ink-400">
            Check your Junk folder if it hasn&apos;t arrived.
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
