/*
  A slim bar under the top bar while the session is in moderator or admin mode,
  so it is never unclear that the buttons on screen now carry real power. Shows
  how long the elevated session has left and a way out.

  Brand tone for moderator, amber for admin.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Crown, ShieldCheck, SignOut } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { sessionMode } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { authApi } from '@/lib/api/auth'

function minutesLeft(expiresAt: number, now: number): number {
  return Math.max(0, Math.ceil((expiresAt - now) / 60_000))
}

export function ModeBanner() {
  const { session, signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mode = sessionMode(session)
  const [now, setNow] = useState(() => Date.now())
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (mode === 'STANDARD') return
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [mode])

  if (!session || mode === 'STANDARD') return null

  async function exitMode() {
    if (!session) return
    setLeaving(true)
    try {
      const response = await authApi.stepDown({ rememberMe: session.remembered })
      signIn(response, session.remembered)
      if (pathname.startsWith('/moderation') || pathname.startsWith('/admin')) {
        navigate('/feed', { replace: true })
      }
    } catch {
      // The elevated token is no good any more; start again from sign-in.
      signOut()
    } finally {
      setLeaving(false)
    }
  }

  const isAdmin = mode === 'ADMIN'
  const Icon = isAdmin ? Crown : ShieldCheck
  const left = minutesLeft(session.expiresAt, now)

  return (
    <div
      role="status"
      className={`border-b ${
        isAdmin ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-brand-100 bg-brand-50 text-brand-800'
      }`}
    >
      <div className="mx-auto flex max-w-360 items-center gap-3 px-3 py-1.5 text-sm sm:px-4">
        <Icon aria-hidden="true" className="size-4 shrink-0" weight="fill" />
        <p className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{isAdmin ? 'Admin mode' : 'Moderator mode'}</span>
          <span className="hidden sm:inline"> · your actions affect other people's accounts</span>
          <span className="opacity-75"> · {left} min left</span>
        </p>
        <button
          type="button"
          onClick={exitMode}
          disabled={leaving}
          className={
            'inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ' +
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 ' +
            (isAdmin ? 'bg-amber-100 hover:bg-amber-200' : 'bg-brand-100 hover:bg-brand-200')
          }
        >
          <SignOut aria-hidden="true" className="size-3.5" />
          Exit mode
        </button>
      </div>
    </div>
  )
}
