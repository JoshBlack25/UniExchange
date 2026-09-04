/*
  Session state.

  The backend is stateless with a one-hour token and no refresh endpoint, so the
  expiry is stored next to the token and checked on load - otherwise the app
  would boot "logged in" holding a token every request rejects.

  localStorage rather than a cookie because the API reads the Authorization
  header only (SessionCreationPolicy.STATELESS, CSRF disabled).
*/

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { api, ApiError } from '@/lib/api'
import type { AuthResponse, User } from '@/lib/api'

import { AuthContext, SESSION_STORAGE_KEY } from './authContext'
import type { AuthContextValue, StoredSession } from './authContext'

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed.token || typeof parsed.expiresAt !== 'number') return null

    // Treat an expired token as no session at all - there is no refresh endpoint.
    if (parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    // Private windows and cleared site data both land here.
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(readStoredSession)
  const [user, setUser] = useState<User | null>(null)

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // The in-memory state below is what actually gates the UI.
    }
    setSession(null)
    setUser(null)
  }, [])

  const signIn = useCallback((response: AuthResponse) => {
    const stored: StoredSession = {
      token: response.token,
      expiresAt: Date.now() + response.expiresIn * 1000,
      email: response.email,
      roles: response.roles,
      userId: response.userId,
    }
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored))
    } catch {
      // Still usable for this tab even if persistence fails.
    }
    setSession(stored)
    setUser(null)
  }, [])

  /*
    Load the profile whenever we hold a session. State is only ever set from the
    async continuation, never synchronously in the effect body, so this does not
    cascade renders. Safe under StrictMode's double invocation via `cancelled`.
  */
  useEffect(() => {
    if (!session) return

    let cancelled = false

    api
      .me(session.token)
      .then((fetched) => {
        if (!cancelled) setUser(fetched)
      })
      .catch((error: unknown) => {
        // A rejected token means the session is dead; anything else is
        // transient and the UI falls back to the stored email.
        if (!cancelled && error instanceof ApiError && error.status === 401) {
          signOut()
        }
      })

    return () => {
      cancelled = true
    }
  }, [session, signOut])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      // Derived rather than stored: we have a session but no profile yet.
      loadingUser: session !== null && user === null,
      isAuthenticated: session !== null,
      signIn,
      signOut,
    }),
    [session, user, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
