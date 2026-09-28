/*
  The standard panel - a frosted, near-opaque card over the app backdrop.
  Pass `to` to make the whole card a link - listing cards in the feed want
  that. Pass `padding="none"` for full-bleed content (post images, lists).
*/

import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  /** When set, the card becomes a router link to this path. */
  to?: string
  padding?: 'none' | 'sm' | 'md'
  className?: string
}

const BASE = 'glass-card block rounded-2xl border shadow-glass'
const PADDING = { none: '', sm: 'p-3', md: 'p-4' } as const
const INTERACTIVE =
  ' transition duration-200 hover:border-brand-300 hover:shadow-float motion-safe:hover:-translate-y-0.5 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

export function Card({ children, to, padding = 'md', className = '' }: CardProps) {
  const classes = `${BASE} ${PADDING[padding]}`

  if (to) {
    return (
      <Link to={to} className={`${classes}${INTERACTIVE} ${className}`}>
        {children}
      </Link>
    )
  }

  return <div className={`${classes} ${className}`}>{children}</div>
}
