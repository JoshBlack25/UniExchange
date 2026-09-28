/*
  Case files: the written report behind every suspension, account deletion and
  content removal. Read-only and permanent. Names, emails and titles are as they
  were when the report was written, so a deleted account's file still says who
  it was.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { EnvelopeSimple, FileText } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { formatRelativeTime } from '@/components/bulletin/relativeTime'
import { ListCard, ListSkeleton } from '@/components/moderation/ModerationUi'
import { useLoad } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Sheet } from '@/components/ui/Sheet'
import { moderationApi } from '@/lib/api/moderation'
import type { ModerationActionType, ModerationReport } from '@/lib/api/types'
import { ACTION_LABEL, reasonLabel } from '@/lib/reportReasons'

const ACTIONS: Array<{ value: ModerationActionType | ''; label: string }> = [
  { value: '', label: 'All actions' },
  { value: 'ACCOUNT_SUSPENDED', label: 'Suspensions' },
  { value: 'ACCOUNT_DELETED', label: 'Account deletions' },
  { value: 'LISTING_REMOVED', label: 'Listing removals' },
  { value: 'POST_REMOVED', label: 'Post removals' },
]

const TONE: Record<ModerationActionType, 'warning' | 'danger' | 'neutral'> = {
  ACCOUNT_SUSPENDED: 'warning',
  ACCOUNT_DELETED: 'danger',
  LISTING_REMOVED: 'neutral',
  POST_REMOVED: 'neutral',
}

const full = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'long', timeStyle: 'short' })

export function ModerationCaseFilesPage() {
  const [params, setParams] = useSearchParams()
  const action = (params.get('action') ?? '') as ModerationActionType | ''
  const [open, setOpen] = useState<ModerationReport | null>(null)

  const { data, error, loading } = useLoad(() => moderationApi.actionReports({ action }), [action])

  function setAction(value: string) {
    const merged = new URLSearchParams(params)
    if (value) merged.set('action', value)
    else merged.delete('action')
    setParams(merged, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="sm:max-w-xs">
        <Select id="case-action" label="Action" value={action} onChange={(event) => setAction(event.target.value)}>
          {ACTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert>{error}</Alert>}
      {loading && !data && <ListSkeleton />}

      {data && data.length === 0 && (
        <EmptyState
          title="No case files yet"
          description="Every suspension, deletion and removal files a written report here."
        />
      )}

      {data && data.length > 0 && (
        <ListCard>
          {data.map((report) => (
            <li key={report.moderationReportId}>
              <button
                type="button"
                onClick={() => setOpen(report)}
                className="flex w-full cursor-pointer flex-col gap-1 p-4 text-left transition hover:bg-surface-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500"
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={TONE[report.action]}>{ACTION_LABEL[report.action]}</Badge>
                  <Badge tone="danger">{reasonLabel(report.reason)}</Badge>
                  <span className="text-xs text-fg-subtle tabular-nums">MR-{report.moderationReportId}</span>
                </span>
                <span className="truncate text-sm font-semibold text-fg">
                  {report.targetTitle ?? report.subjectName}
                  {report.targetType !== 'USER' && (
                    <span className="font-normal text-fg-muted"> · {report.subjectName}</span>
                  )}
                </span>
                <span className="line-clamp-2 text-sm text-fg-muted">{report.details}</span>
                <span className="text-xs text-fg-subtle">
                  By {report.moderatorName} · <time dateTime={report.createdAt}>{formatRelativeTime(report.createdAt)}</time>
                  {report.sentToUser && (report.emailedAt ? ' · sent to user' : ' · notified (email failed)')}
                </span>
              </button>
            </li>
          ))}
        </ListCard>
      )}

      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? `${ACTION_LABEL[open.action]} · MR-${open.moderationReportId}` : ''}
        description={open ? full.format(new Date(open.createdAt)) : undefined}
      >
        {open && (
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Reason</dt>
              <dd className="mt-0.5 text-fg">{reasonLabel(open.reason)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Report</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-fg">{open.details}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Account</dt>
              <dd className="mt-0.5 text-fg">
                <Link to={`/profile/${open.subjectUserId}`} className="font-medium hover:underline">
                  {open.subjectName}
                </Link>{' '}
                <span className="text-fg-muted">({open.subjectEmail})</span>
              </dd>
            </div>
            {open.targetType !== 'USER' && (
              <div>
                <dt className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                  {open.targetType === 'LISTING' ? 'Listing' : 'Post'}
                </dt>
                <dd className="mt-0.5 text-fg">
                  {open.targetType === 'LISTING' ? (
                    <Link to={`/listings/${open.targetId}`} className="font-medium hover:underline">
                      {open.targetTitle}
                    </Link>
                  ) : (
                    open.targetTitle
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Moderator</dt>
              <dd className="mt-0.5 text-fg">{open.moderatorName}</dd>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-surface-muted p-3 text-fg-muted">
              {open.sentToUser ? (
                <EnvelopeSimple aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              ) : (
                <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              )}
              <p>
                {open.sentToUser
                  ? open.emailedAt
                    ? `Sent to the user by notification and email on ${full.format(new Date(open.emailedAt))}.`
                    : 'Sent to the user by notification. The email could not be delivered.'
                  : 'Kept on file. The user was not sent this report.'}
                {open.userReportId != null && ' Filed in answer to a user report.'}
              </p>
            </div>
          </dl>
        )}
      </Sheet>
    </div>
  )
}
