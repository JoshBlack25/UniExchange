/*
  Role and session-mode helpers.

  Two different questions, easy to mix up:

    hasRole(session, 'MODERATOR')  does this ACCOUNT hold the role?
    useIsModerator()               is this SESSION in moderator (or admin) mode?

  Moderation UI must key off the second. A moderator who signed in normally is
  browsing as a student, and the backend will refuse their moderation calls
  anyway - showing them the buttons would only produce errors.

  Roles arrive from the backend as "ROLE_STUDENT"; they are compared without the
  prefix.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import type { RoleType, SessionMode } from '@/lib/api/types'
import type { StoredSession } from '@/lib/session'

import { useAuth } from './useAuth'

export function normaliseRole(role: string): string {
  return role.replace(/^ROLE_/, '')
}

export function hasRole(session: StoredSession | null, role: RoleType): boolean {
  return session?.roles.some((r) => normaliseRole(r) === role) ?? false
}

export function sessionMode(session: StoredSession | null): SessionMode {
  return session?.mode ?? 'STANDARD'
}

export function useSessionMode(): SessionMode {
  return sessionMode(useAuth().session)
}

/** True in a moderator OR admin session - an admin can do everything a moderator can. */
export function useIsModerator(): boolean {
  const mode = useSessionMode()
  return mode === 'MODERATOR' || mode === 'ADMIN'
}

export function useIsAdmin(): boolean {
  return useSessionMode() === 'ADMIN'
}
