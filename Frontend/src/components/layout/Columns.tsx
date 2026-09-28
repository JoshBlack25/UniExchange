/*
  Main column + optional right rail, the Facebook "feed | sidebar" split.

    <Columns aside={<FeedSidebar … />}>
      …the page…
    </Columns>

  The rail only appears from xl; below that it is simply not rendered, so put
  anything essential in the main column too (or behind a Sheet on mobile).
  `narrow` caps the main column at a readable feed width (~680px) - use it
  for post-style pages, not for grids.
*/

import type { ReactNode } from 'react'

type ColumnsProps = {
  children: ReactNode
  aside?: ReactNode
  /** Label for the rail landmark. */
  asideLabel?: string
  narrow?: boolean
}

export function Columns({ children, aside, asideLabel = 'More', narrow = false }: ColumnsProps) {
  return (
    <div className="flex items-start gap-6">
      <div className={`min-w-0 flex-1 ${narrow ? 'mx-auto max-w-2xl' : ''}`}>{children}</div>

      {aside && (
        <aside aria-label={asideLabel} className="sticky top-22 hidden max-h-[calc(100dvh-6.5rem)] w-80 shrink-0 space-y-4 overflow-y-auto overscroll-contain pb-4 [scrollbar-width:thin] xl:block">
          {aside}
        </aside>
      )}
    </div>
  )
}
