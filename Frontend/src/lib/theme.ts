/*
  Light / dark / follow-the-system theme.

  A tiny external store rather than a context provider: the preference lives
  in localStorage, the effective theme is a `.dark` class on <html>, and
  components subscribe with useTheme(). index.html applies the saved choice
  before first paint (keep STORAGE_KEY in sync with the script there).

    const { preference, resolved, setPreference, toggle } = useTheme()

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'ux-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // Private mode / blocked storage - fall back to the system setting.
  }
  return 'system'
}

let preference: ThemePreference = readPreference()

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return media.matches ? 'dark' : 'light'
  return pref
}

function apply() {
  document.documentElement.classList.toggle('dark', resolve(preference) === 'dark')
  listeners.forEach((listener) => listener())
}

media.addEventListener('change', () => {
  if (preference === 'system') apply()
})

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Still applies for this visit; it just will not be remembered.
  }
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/* One string snapshot so useSyncExternalStore gets a stable value. */
function snapshot() {
  return `${preference}:${resolve(preference)}`
}

export function useTheme() {
  const [pref, resolved] = useSyncExternalStore(subscribe, snapshot).split(':') as [
    ThemePreference,
    ResolvedTheme,
  ]

  return {
    preference: pref,
    resolved,
    setPreference: setThemePreference,
    /** Flip between light and dark, leaving "system" behind. */
    toggle: () => setThemePreference(resolved === 'dark' ? 'light' : 'dark'),
  }
}
