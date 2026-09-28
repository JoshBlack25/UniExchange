/*
  "Feed › Textbooks › Calculus 1" trail above a page title. Rendered through
  PageHeader's `breadcrumbs` prop rather than on its own, so it always sits in
  the same place:

    <PageHeader
      title={listing.title}
      breadcrumbs={[{ label: 'Feed', to: '/feed' }, { label: 'Textbooks', to: '/feed?category=3' }, { label: listing.title }]}
    />

  The last crumb is the current page: plain text with aria-current, never a link.
*/

import { CaretRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

export type Crumb = {
  label: string
  /** Omit on the last crumb (the current page). */
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-1.5 min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs font-medium text-fg-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${index}-${item.label}`} className="flex min-w-0 items-center gap-1">
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="inline-flex min-h-6 items-center rounded-sm transition underline-offset-2 hover:text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  title={last ? item.label : undefined}
                  className={`truncate ${last ? 'max-w-[16rem] text-fg' : ''}`}>
                  {item.label}
                </span>
              )}
              {!last && <CaretRight aria-hidden="true" weight="bold" className="size-3 shrink-0 text-fg-subtle" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
