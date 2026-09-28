/*
  What users reported with the Report button. From each report a moderator can
  take action - remove the listing or post, or suspend the account, with the
  written report every such action needs (pre-filled with the user's reason) -
  or dismiss it. Either way the reporter is told the outcome.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { CheckCircle, ShieldWarning } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { formatRelativeTime } from '@/components/bulletin/relativeTime'
import { ActionReportDialog } from '@/components/moderation/ActionReportDialog'
import { ConfirmDialog, ListCard, ListSkeleton } from '@/components/moderation/ModerationUi'
import { useLoad } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { moderationApi } from '@/lib/api/moderation'
import type { ActionReport, ModerationActionType, ReportStatus, ReportTargetType, UserReport } from '@/lib/api/types'
import { reasonLabel } from '@/lib/reportReasons'

const STATUSES: Array<{ value: ReportStatus | 'ALL'; label: string }> = [
  { value: 'PENDING', label: 'Open' },
  { value: 'RESOLVED', label: 'Action taken' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'ALL', label: 'All reports' },
]

const STATUS_BADGE: Record<ReportStatus, { tone: 'warning' | 'success' | 'neutral'; label: string }> = {
  PENDING: { tone: 'warning', label: 'Open' },
  REVIEWED: { tone: 'warning', label: 'In review' },
  RESOLVED: { tone: 'success', label: 'Action taken' },
  DISMISSED: { tone: 'neutral', label: 'Dismissed' },
}

const KIND: Record<ReportTargetType, string> = {
  LISTING: 'Listing',
  BULLETIN_POST: 'Post',
  USER: 'Profile',
  MESSAGE: 'Message',
}

const ACTION_FOR: Partial<Record<ReportTargetType, ModerationActionType>> = {
  LISTING: 'LISTING_REMOVED',
  BULLETIN_POST: 'POST_REMOVED',
  USER: 'ACCOUNT_SUSPENDED',
}

const ACTION_LABEL: Record<ModerationActionType, string> = {
  LISTING_REMOVED: 'Remove listing',
  POST_REMOVED: 'Remove post',
  ACCOUNT_SUSPENDED: 'Suspend account',
  ACCOUNT_DELETED: 'Delete account',
}

function targetHref(report: UserReport): string | null {
  if (report.targetType === 'LISTING') return `/listings/${report.targetId}`
  if (report.targetType === 'USER') return `/profile/${report.targetId}`
  if (report.targetType === 'BULLETIN_POST') return '/moderation/posts'
  return null
}

type Pending = { kind: 'act' | 'dismiss'; report: UserReport } | null

export function ModerationReportsPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? 'PENDING') as ReportStatus | 'ALL'
  const [pending, setPending] = useState<Pending>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, error, loading, reload } = useLoad(
    () => moderationApi.userReports(status === 'ALL' ? '' : status),
    [status],
  )

  function setStatus(value: string) {
    const merged = new URLSearchParams(params)
    if (value && value !== 'PENDING') merged.set('status', value)
    else merged.delete('status')
    setParams(merged, { replace: true })
  }

  async function act(report: ActionReport) {
    if (!pending) return
    const target = pending.report
    if (target.targetType === 'LISTING') await moderationApi.removeListing(target.targetId, report)
    else if (target.targetType === 'BULLETIN_POST') await moderationApi.removePost(target.targetId, report)
    else await moderationApi.suspend(target.targetId, report)
    setNotice(`Done. "${target.targetTitle}" was dealt with and the reporter has been told.`)
    reload()
  }

  async function dismiss(note: string) {
    if (!pending) return
    await moderationApi.dismissUserReport(pending.report.reportId, note)
    setNotice('Report dismissed. The reporter has been told it was reviewed.')
    reload()
  }

  const acting = pending?.kind === 'act' ? pending.report : null
  const action = acting ? ACTION_FOR[acting.targetType] : undefined

  return (
    <div className="space-y-4">
      <div className="sm:max-w-xs">
        <Select id="report-status" label="Show" value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      {loading && !data && <ListSkeleton />}

      {data && data.length === 0 && (
        <EmptyState
          title={status === 'PENDING' ? 'No open reports' : 'No reports here'}
          description="Reports people send with the Report button on listings, posts and profiles appear here."
        />
      )}

      {data && data.length > 0 && (
        <ListCard>
          {data.map((report) => {
            const badge = STATUS_BADGE[report.status]
            const href = targetHref(report)
            const open = report.status === 'PENDING' || report.status === 'REVIEWED'
            const canAct = open && ACTION_FOR[report.targetType] !== undefined && report.targetOwner !== null
            return (
              <li key={report.reportId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                    <Badge tone="danger">{reasonLabel(report.category)}</Badge>
                    <Badge>{KIND[report.targetType]}</Badge>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold text-fg">
                    {href ? (
                      <Link to={href} className="hover:underline">
                        {report.targetTitle}
                      </Link>
                    ) : (
                      report.targetTitle
                    )}
                  </p>
                  {report.details && (
                    <p className="mt-0.5 line-clamp-3 text-sm break-words text-fg-muted">“{report.details}”</p>
                  )}
                  <p className="mt-1 text-xs text-fg-subtle">
                    Reported by{' '}
                    {report.reporter ? (
                      <Link to={`/profile/${report.reporter.userId}`} className="font-medium hover:underline">
                        {report.reporter.name}
                      </Link>
                    ) : (
                      'a deleted account'
                    )}
                    {report.targetOwner && report.targetType !== 'USER' && (
                      <>
                        {' · owner '}
                        <Link to={`/profile/${report.targetOwner.userId}`} className="font-medium hover:underline">
                          {report.targetOwner.name}
                        </Link>
                      </>
                    )}
                    {' · '}
                    <time dateTime={report.createdAt}>{formatRelativeTime(report.createdAt)}</time>
                  </p>
                  {report.resolutionNote && !open && (
                    <p className="mt-1 text-xs text-fg-muted">Outcome: {report.resolutionNote}</p>
                  )}
                </div>
                {open && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canAct && (
                      <Button
                        variant="danger"
                        size="sm"
                        className="sm:w-auto"
                        onClick={() => setPending({ kind: 'act', report })}
                      >
                        <ShieldWarning aria-hidden="true" className="size-4" />
                        {ACTION_LABEL[ACTION_FOR[report.targetType]!]}
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="sm:w-auto"
                      onClick={() => setPending({ kind: 'dismiss', report })}
                    >
                      <CheckCircle aria-hidden="true" className="size-4" />
                      Dismiss
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ListCard>
      )}

      {action && (
        <ActionReportDialog
          open={pending?.kind === 'act'}
          action={action}
          initialReason={acting?.category}
          userReportId={acting?.reportId}
          title={`${ACTION_LABEL[action]}?`}
          description={
            <>
              Acting on the report about <strong>{acting?.targetTitle}</strong>. Every open report about it is closed
              and the reporters are told action was taken.
            </>
          }
          confirmLabel={ACTION_LABEL[action]}
          onClose={() => setPending(null)}
          onConfirm={act}
        />
      )}
      <ConfirmDialog
        open={pending?.kind === 'dismiss'}
        tone="primary"
        title="Dismiss this report?"
        description="Nothing is changed. The reporter is told a moderator reviewed it and found it within the guidelines."
        askReason
        reasonLabel="Note for the record"
        confirmLabel="Dismiss report"
        onClose={() => setPending(null)}
        onConfirm={dismiss}
      />
    </div>
  )
}
