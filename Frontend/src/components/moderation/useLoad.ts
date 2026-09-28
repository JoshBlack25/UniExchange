/*
  The load-on-mount pattern every moderation page uses, in one place:
  useEffect + a `cancelled` flag (safe under StrictMode's double run), plus a
  reload() for after an action changes the data.

  Kept out of the component files so Vite's fast refresh keeps working.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '@/lib/api/client'

export type Loaded<T> = {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]): Loaded<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo -- the caller lists what `load` depends on
  const stableLoad = useCallback(load, deps)

  useEffect(() => {
    let cancelled = false
    stableLoad()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setError(caught instanceof ApiError ? caught.message : 'Could not load this. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [stableLoad, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { data, error, loading, reload }
}

/** Turns anything thrown by an API call into a sentence for an <Alert>. */
export function errorMessage(caught: unknown): string {
  return caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.'
}
