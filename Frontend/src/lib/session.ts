/*
  Where the signed-in session lives in the browser.

  This is a tiny module on purpose. Both auth/authContext.ts and lib/api/client.ts
  need the storage key: if the API client imported it from authContext, and
  authContext imported its types from lib/api, that would be an import cycle.
  Keeping the key and the stored shape here breaks the cycle cleanly.

  localStorage rather than a cookie because the backend reads the Authorization
  header only (SessionCreationPolicy.STATELESS, CSRF disabled).

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

export const SESSION_STORAGE_KEY = 'uniexchange.session'

export type StoredSession = {
  token: string
  /** Epoch milliseconds. The backend token lasts an hour and cannot be refreshed. */
  expiresAt: number
  email: string
  roles: string[]
  userId: number
}

/** The stored session, or null when absent, malformed or expired. */
export function readStoredSession(): StoredSession | null {
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

export function writeStoredSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Still usable for this tab even if persistence fails.
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // In-memory state is what actually gates the UI.
  }
}

/** The bearer token for the current session, or null. Used by authedRequest(). */
export function currentToken(): string | null {
  return readStoredSession()?.token ?? null
}
