/*
  Small pieces shared by the moderation pages. Built from the app's own
  primitives and tokens so the dashboard looks like the rest of UniExchange,
  not a bolted-on admin theme.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { useIsAdmin } from '@/auth/roles'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Textarea } from '@/components/ui/Textarea'
import type { AccountStatus, Affiliation, RoleType } from '@/lib/api/types'

import { ADMIN_SECTIONS, MODERATION_SECTIONS } from './moderationSections'
import { errorMessage } from './useLoad'

/* ------------------------------------------------------------------ tabs */


/** Route-driven tab strip, styled like ProfileTabs. Links, not ARIA tabs, since each tab is a page. */
export function ModerationTabs() {
  const isAdmin = useIsAdmin()
  const tabs = isAdmin ? [...MODERATION_SECTIONS, ...ADMIN_SECTIONS] : MODERATION_SECTIONS

  return (
    <nav aria-label="Moderation sections" className="glass-card -mx-1 mb-5 rounded-2xl border px-1 shadow-glass">
      <ul className="scroller-x flex gap-1">
        {tabs.map((tab) => (
          <li key={tab.to} className="shrink-0 snap-start">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                'relative inline-flex min-h-12 items-center whitespace-nowrap px-4 text-sm font-semibold transition ' +
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 ' +
                (isActive ? 'text-brand-700' : 'rounded-xl text-fg-muted hover:bg-surface-muted hover:text-fg')
              }
            >
              {({ isActive }) => (
                <>
                  {tab.label}
                  {isActive && (
                    <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* --------------------------------------------------------------- badges */

const STATUS_TONE: Record<AccountStatus, 'success' | 'danger' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  DEACTIVATED: 'neutral',
  PENDING_VERIFICATION: 'warning',
}

const STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deleted',
  PENDING_VERIFICATION: 'Unverified',
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
}

export function AffiliationBadge({ affiliation }: { affiliation: Affiliation | undefined | null }) {
  return affiliation === 'STAFF' ? <Badge tone="brand">CPUT Staff</Badge> : <Badge>Student</Badge>
}

export function StaffRoleBadges({ roles }: { roles: RoleType[] }) {
  return (
    <>
      {roles.includes('ADMIN') && <Badge tone="warning">Admin</Badge>}
      {roles.includes('MODERATOR') && <Badge tone="brand">Moderator</Badge>}
    </>
  )
}

/* ------------------------------------------------------------ stat card */

export function StatCard({
  label,
  value,
  to,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: number | null
  to?: string
  tone?: 'neutral' | 'danger' | 'warning' | 'brand'
  icon: ReactNode
}) {
  const chip = {
    neutral: 'bg-surface-muted text-fg',
    danger: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700',
    brand: 'bg-brand-50 text-brand-700',
  }[tone]

  const body = (
    <>
      <span aria-hidden="true" className={`grid size-10 place-items-center rounded-full [&>svg]:size-5 ${chip}`}>
        {icon}
      </span>
      <span className="mt-3 block text-2xl font-bold tabular-nums tracking-tight text-fg">
        {value === null ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-surface-muted" /> : value}
      </span>
      <span className="mt-0.5 block text-sm text-fg-muted">{label}</span>
    </>
  )

  const className =
    'glass-card block rounded-2xl border p-4 shadow-glass transition ' +
    (to ? 'hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-2 focus-visible:outline-brand-500' : '')

  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

/* -------------------------------------------------------- list helpers */

/** A card that holds a divided list of rows. */
export function ListCard({ children }: { children: ReactNode }) {
  return (
    <div className="glass-card overflow-hidden rounded-2xl border shadow-glass">
      <ul className="divide-y divide-line">{children}</ul>
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="glass-card rounded-2xl border p-4 shadow-glass">
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-10 shrink-0 animate-pulse rounded-full bg-surface-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------- reason dialog */

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  /** Ask for a reason (recorded in the audit log, and sent to the owner where relevant). */
  askReason?: boolean
  reasonLabel?: string
  tone?: 'danger' | 'primary'
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

/**
 * Confirmation for anything that affects someone else's account or content.
 * Stays open and shows the error if the request fails, so nothing is lost.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  askReason = false,
  reasonLabel = 'Reason',
  tone = 'danger',
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function close() {
    if (busy) return
    setReason('')
    setError(null)
    onClose()
  }

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
      setReason('')
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      variant="dialog"
      dismissible={!busy}
      title={title}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="sm:w-auto" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            className="sm:w-auto"
            loading={busy}
            disabled={askReason && reason.trim().length === 0}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className={`rounded-xl p-3 text-sm ${tone === 'danger' ? 'bg-red-50 text-red-800' : 'bg-brand-50 text-brand-800'}`}>
          {description}
        </div>
        {error && <Alert>{error}</Alert>}
        {askReason && (
          <Textarea
            label={reasonLabel}
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint="Kept in the moderation log."
          />
        )}
      </div>
    </Sheet>
  )
}
