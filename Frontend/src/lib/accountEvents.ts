/*
  accountEvents - lets the API client tell AuthProvider "this account has been
  suspended" without importing React.

  The backend answers ANY request from a banned account with 403 and
  code ACCOUNT_SUSPENDED (the JWT filter checks status on every request). The
  client emits this; AuthProvider signs out and remembers why, so the login
  page can explain instead of the student just being dropped at a blank form.

  Same shape as notificationEvents.ts: one event, no payload.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

type Listener = () => void

const listeners = new Set<Listener>()

export function emitAccountSuspended(): void {
  for (const listener of listeners) listener()
}

/** Returns an unsubscribe function - call it from a useEffect cleanup. */
export function onAccountSuspended(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/*
  Carries the "you were suspended" notice across the redirect to /login. Session
  storage, so it disappears with the tab and never outlives the moment.
*/
const NOTICE_KEY = 'uniexchange.suspended'

export function rememberSuspendedNotice(): void {
  try {
    window.sessionStorage.setItem(NOTICE_KEY, '1')
  } catch {
    // The login page just won't show the explanation.
  }
}

/** Reads and clears the notice. */
export function takeSuspendedNotice(): boolean {
  try {
    const present = window.sessionStorage.getItem(NOTICE_KEY) !== null
    window.sessionStorage.removeItem(NOTICE_KEY)
    return present
  } catch {
    return false
  }
}
