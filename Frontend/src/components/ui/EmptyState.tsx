/*
  Shown when a list has nothing in it, or when a page is not built yet.
  Every scaffolded page uses this so an unfinished route still looks deliberate.
*/

import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description?: ReactNode
  /** Usually a Button or a Link. */
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="glass-card rounded-2xl border border-dashed !border-brand-200 p-8 text-center">
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
