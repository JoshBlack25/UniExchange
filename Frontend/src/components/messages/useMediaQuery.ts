/*
  True while a CSS media query matches, e.g. useMediaQuery('(min-width: 64rem)').

  ChatPage uses it so the conversation list pane is only MOUNTED on screens
  that show it - hiding it with CSS alone would leave its inbox poll running
  on every phone that has a chat open.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
