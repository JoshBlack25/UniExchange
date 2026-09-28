/*
  The flagged-review queue: every review rated at or below the bad-review
  threshold (2 stars by default) that nobody has dealt with yet.

    Dismiss         the review is fair - it stays up and leaves the queue
    Remove review   it breaks the rules - it is deleted (the one hard delete)
    Suspend         the reviewer is abusing reviews - their account is suspended

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Check, Prohibit, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { formatRelativeTime } from '@/components/bulletin/relativeTime'
import { ActionReportDialog } from '@/components/moderation/ActionReportDialog'
import { ConfirmDialog, ListSkeleton } from '@/components/moderation/ModerationUi'
import { useLoad } from '@/components/moderation/useLoad'
import { StarRating } from '@/components/reviews/StarRating'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { moderationApi } from '@/lib/api/moderation'
import type { ActionReport, FlaggedReview, UserSummary } from '@/lib/api/types'

type Pending = { kind: 'dismiss' | 'remove' | 'suspend'; review: FlaggedReview } | null

function Person({ user }: { user: UserSummary | null }) {
  if (!user) return <span className="font-semibold">a deleted account</span>
  return (
    <Link to={`/profile/${user.userId}`} className="font-semibold text-brand-700 hover:underline">
      {user.name}
    </Link>
  )
}

export function ModerationReviewsPage() {
  const [pending, setPending] = useState<Pending>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, error, loading, reload } = useLoad(() => moderationApi.flaggedReviews(), [])

  async function runPending(reason: string) {
    if (!pending) return
    const { kind, review } = pending
    if (kind === 'dismiss') {
      await moderationApi.dismissReview(review.reviewId, reason)
      setNotice('The review stays up and has left the queue.')
    } else if (kind === 'remove') {
      await moderationApi.removeReview(review.reviewId, reason)
      setNotice('The review was removed.')
    }
    reload()
  }

  async function runSuspend(report: ActionReport) {
    const reviewer = pending?.review.reviewer
    if (!reviewer) return
    await moderationApi.suspend(reviewer.userId, report)
    setNotice(`${reviewer.name} is suspended and has been signed out everywhere. Your report is on file.`)
    reload()
  }

  return (
    <div className="space-y-4">
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      {loading && !data && <ListSkeleton rows={3} />}

      {data && data.length === 0 && (
        <EmptyState title="Nothing flagged" description="Low-rated reviews will show up here for a second look." />
      )}

      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((review) => {
            const reviewerActive = review.reviewer?.accountStatus === 'ACTIVE'
            return (
              <li key={review.reviewId} className="glass-card rounded-2xl border p-4 shadow-glass">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StarRating value={review.rating} />
                  <time dateTime={review.createdAt} className="text-xs text-fg-subtle">
                    {formatRelativeTime(review.createdAt)}
                  </time>
                </div>
                <p className="mt-2 text-sm break-words whitespace-pre-line text-fg">
                  {review.comment || <span className="text-fg-muted italic">No comment, rating only.</span>}
                </p>
                <p className="mt-2 text-sm text-fg-muted">
                  <Person user={review.reviewer} /> reviewed <Person user={review.reviewee} />
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="sm:w-auto"
                    onClick={() => setPending({ kind: 'dismiss', review })}
                  >
                    <Check aria-hidden="true" className="size-4" />
                    Dismiss
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="sm:w-auto"
                    onClick={() => setPending({ kind: 'remove', review })}
                  >
                    <Trash aria-hidden="true" className="size-4" />
                    Remove review
                  </Button>
                  {reviewerActive && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="sm:w-auto"
                      onClick={() => setPending({ kind: 'suspend', review })}
                    >
                      <Prohibit aria-hidden="true" className="size-4" />
                      Suspend reviewer
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pending?.kind === 'dismiss'}
        tone="primary"
        title="Keep this review?"
        description="The review stays on their profile and leaves the flagged queue."
        confirmLabel="Dismiss flag"
        onClose={() => setPending(null)}
        onConfirm={runPending}
      />
      <ConfirmDialog
        open={pending?.kind === 'remove'}
        title="Remove this review?"
        description={
          <>
            The review is deleted and no longer counts towards the seller's rating.{' '}
            <strong>This cannot be undone.</strong>
          </>
        }
        askReason
        reasonLabel="Why are you removing it?"
        confirmLabel="Remove review"
        onClose={() => setPending(null)}
        onConfirm={runPending}
      />
      <ActionReportDialog
        open={pending?.kind === 'suspend'}
        action="ACCOUNT_SUSPENDED"
        initialReason="HARASSMENT_OR_BULLYING"
        title="Suspend the reviewer?"
        description={
          <>
            <strong>{pending?.review.reviewer?.name}</strong> will be signed out everywhere and cannot sign in
            until a moderator reinstates them. The review itself stays in the queue.
          </>
        }
        confirmLabel="Suspend account"
        onClose={() => setPending(null)}
        onConfirm={runSuspend}
      />
    </div>
  )
}
