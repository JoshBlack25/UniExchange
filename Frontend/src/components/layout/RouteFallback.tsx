/*
  Shown while a lazily loaded page's code arrives (App.tsx splits each route
  into its own chunk). Usually on screen for a frame or two, so it is just the
  shared Spinner, centred - no layout of its own to jump from.
*/

import { Spinner } from '@/components/ui/Spinner'

export function RouteFallback({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={`grid place-items-center ${fullScreen ? 'min-h-dvh' : 'min-h-[50vh]'}`}>
      <Spinner label="Loading page" className="size-7" />
    </div>
  )
}
