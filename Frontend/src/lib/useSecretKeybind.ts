/*
  The hidden entry to moderator and admin sign-in.

    Ctrl + Alt + M   moderator
    Ctrl + Alt + A   admin

  (Ctrl + Option on a Mac.) Matched on event.code, not event.key, because Option
  turns "m" into "µ" on macOS. Neither combination is a browser or OS shortcut.

  This hides the entry point; it is not what keeps anyone out. The backend
  checks the role on the account for every elevated sign-in and every request.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { useEffect, useRef } from 'react'

export type SecretMode = 'MODERATOR' | 'ADMIN'

const CODES: Record<string, SecretMode> = {
  KeyM: 'MODERATOR',
  KeyA: 'ADMIN',
}

export function useSecretKeybind(onTrigger: (mode: SecretMode) => void): void {
  // Latest callback without re-binding the listener on every render.
  const callback = useRef(onTrigger)
  useEffect(() => {
    callback.current = onTrigger
  }, [onTrigger])

  useEffect(() => {
    function handle(event: KeyboardEvent) {
      if (!event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey || event.repeat) return
      const mode = CODES[event.code]
      if (!mode) return
      event.preventDefault()
      callback.current(mode)
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])
}
