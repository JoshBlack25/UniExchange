/*
  The code step. /verify-otp is the only endpoint that issues a token AND the
  only one that trusts a device, so everything funnels through here: a made-up
  student number stops here permanently, and a browser can only skip the code
  later by having entered one now.

  Two journeys arrive at the same screen:
    signup            - the code activates a brand-new account.
    an ordinary login - the account already works, and the code is a second
                        factor because this browser is not recognised.

  Reachable four ways - router state from signup, router state from login, a
  ?email= query param, or the unverified-account redirect - so closing the tab
  does not strand anyone.

  rememberMe rides along in the router state rather than being asked again here:
  the student already answered it on the sign-in form, and it has to reach
  signIn() so the new device token lands in the matching store.
*/

import { EnvelopeSimpleOpen } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth'
import { Seo } from '@/components/seo/Seo'
import { Alert } from '@/components/ui/Alert'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { OtpInput } from '@/components/ui/OtpInput'
import { authApi } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import type { SessionMode } from '@/lib/api/types'

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60

type LocationState = {
  email?: string
  autoResend?: boolean
  /** The "Remember me" answer from the sign-in form, if the student came from there. */
  rememberMe?: boolean
  /** Where they were originally headed before being sent here. */
  from?: string
  /** Set by the hidden moderator/admin sign-in, so the session opens in that mode. */
  mode?: SessionMode
  /** From an elevated sign-in: proves the password was checked, so the mode is honoured. */
  loginTicket?: string
} | null

export function VerifyOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { signIn } = useAuth()

  const state = location.state as LocationState
  const email = (state?.email ?? searchParams.get('email') ?? '').toLowerCase()

  // Signup has no checkbox - a brand-new account is a brand-new device by
  // definition - so false is the right default for everything but a login.
  const rememberMe = state?.rememberMe ?? false
  const destination = state?.from ?? '/feed'

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
      const response = await authApi.verifyOtp({
        email,
        code: submittedCode,
        rememberMe,
        mode: state?.mode,
        loginTicket: state?.loginTicket,
      })
      // signIn also persists response.deviceToken, which is what lets the next
      // sign-in from this browser skip the code entirely.
      signIn(response, rememberMe)
      navigate(destination, { replace: true })
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
      const response = await authApi.resendOtp({ email })
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
          <Link to="/signup" className="rounded font-semibold text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
            Back to sign up
          </Link>
        }
      >
        <Seo title="Verify your email" description="Confirm your CPUT email address with the code we sent you." noindex />
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
          We sent a {CODE_LENGTH}-digit code to <span className="font-semibold text-fg wrap-break-word">{email}</span>.
          It expires in 10 minutes.
          {rememberMe && ' We will remember this device, so this is the last time you will need one here.'}
        </>
      }
      footer={
        <Link to="/login" className="rounded font-semibold text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
          Back to sign in
        </Link>
      }
    >
      <Seo title="Enter your code" description="Confirm your CPUT email address with the code we sent you." noindex />
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(code)
        }}
      >
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}

        {/* Decorative: "check your inbox". */}
        <div aria-hidden="true" className="flex justify-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <EnvelopeSimpleOpen weight="duotone" className="size-7" />
          </span>
        </div>

        {/*
          contain:inline-size stops the six inputs' intrinsic widths leaking into
          AuthLayout's auto grid track - without it a phone lays the page out
          ~460px wide and the card runs off the right edge.
        */}
        <div className="[contain:inline-size]">
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={(complete) => void submit(complete)}
            disabled={submitting}
            invalid={error !== null}
          />
        </div>

        <Button type="submit" loading={submitting} disabled={code.length !== CODE_LENGTH}>
          Verify and continue
        </Button>

        <div className="rounded-2xl border border-line bg-surface-muted/60 px-4 py-3 text-center text-sm text-fg-muted">
          Didn&apos;t get it?{' '}
          <button
            type="button"
            onClick={() => void resend()}
            disabled={cooldown > 0}
            className={
              'inline-flex min-h-11 items-center rounded-lg px-1 font-semibold text-brand-700 hover:underline tabular-nums ' +
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
              'disabled:text-fg-muted disabled:no-underline'
            }
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new code'}
          </button>
          <p className="text-xs text-fg-muted">
            Check your Junk folder if it hasn&apos;t arrived.
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
