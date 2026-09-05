/*
  The context object and its types, kept in a component-free module so Vite's
  fast refresh keeps working (a file that mixes components with other exports
  loses HMR).

  The storage key and StoredSession shape now live in @/lib/session, because the
  API client needs them too and importing them from here would create a cycle.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { createContext } from 'react'

import type { AuthResponse, User } from '@/lib/api/types'
import type { StoredSession } from '@/lib/session'

export type AuthContextValue = {
  session: StoredSession | null
  user: User | null
  loadingUser: boolean
  isAuthenticated: boolean
  signIn: (response: AuthResponse) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
