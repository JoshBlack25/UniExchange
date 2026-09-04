/*
  The context object and its types, kept in a component-free module so Vite's
  fast refresh keeps working (a file that mixes components with other exports
  loses HMR).
*/

import { createContext } from 'react'

import type { AuthResponse, User } from '@/lib/api'

export const SESSION_STORAGE_KEY = 'uniexchange.session'

export type StoredSession = {
  token: string
  expiresAt: number
  email: string
  roles: string[]
  userId: number
}

export type AuthContextValue = {
  session: StoredSession | null
  user: User | null
  loadingUser: boolean
  isAuthenticated: boolean
  signIn: (response: AuthResponse) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
