/*
  The in-app half of the hidden sign-in. Mounted once in AppLayout: pressing
  Ctrl+Alt+M (moderator) or Ctrl+Alt+A (admin) anywhere in the app asks for the
  password again and switches this session into that mode.

  A student pressing the keys sees the same dialog and simply gets "That
  password is not correct." - the backend decides, and it answers the same way
  whether the password or the role was missing.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Crown, ShieldCheck } from '@phosphor-icons/react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { sessionMode } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { PasswordField } from '@/components/auth/PasswordField'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { authApi } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { useSecretKeybind } from '@/lib/useSecretKeybind'
import type { SecretMode } from '@/lib/useSecretKeybind'

const COPY: Record<SecretMode, { title: string; label: string }> = {
  MODERATOR: { title: 'Enter moderator mode', label: 'moderator' },
  ADMIN: { title: 'Enter admin mode', label: 'admin' },
}

export function ElevateSheet() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [target, setTarget] = useState<SecretMode | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useSecretKeybind((mode) => {
    // Already there: just go to the dashboard instead of asking again.
    if (sessionMode(session) === mode) {
      navigate(mode === 'ADMIN' ? '/admin/staff' : '/moderation')
      return
    }
    setPassword('')
    setError(null)
    setTarget(mode)
  })

  function close() {
    if (submitting) return
    setTarget(null)
    setPassword('')
    setError(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!target || !session || !password) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await authApi.elevate({ password, mode: target })
      // Same store as the session it replaces, so stepping down later lands back there.
      signIn(response, session.remembered)
      setTarget(null)
      setPassword('')
      navigate('/moderation')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!target) return null
  const copy = COPY[target]
  const Icon = target === 'ADMIN' ? Crown : ShieldCheck

  return (
    <Sheet
      open
      onClose={close}
      variant="dialog"
      dismissible={!submitting}
      title={
        <span className="flex items-center gap-2">
          <Icon aria-hidden="true" className={`size-5 ${target === 'ADMIN' ? 'text-amber-600' : 'text-brand-600'}`} weight="duotone" />
          {copy.title}
        </span>
      }
      description={`Confirm it's you. The ${copy.label} session lasts one hour, or until you exit it.`}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <PasswordField
          label="Your password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="sm:w-auto" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" className="sm:w-auto" loading={submitting} disabled={!password}>
            Continue
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
