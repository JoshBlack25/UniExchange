/*
  Student bulletin posts, filtered by status. A moderator can take a post down
  (REMOVED, the author is told why) or put a removed one back. Campus
  announcements have their own tab, so they are left out here.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { ArrowCounterClockwise, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { CATEGORY_LABELS } from '@/components/bulletin/categoryLabels'
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
import type { ActionReport, BulletinPost, BulletinPostStatus } from '@/lib/api/types'

const STATUSES: Array<{ value: BulletinPostStatus | ''; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'HIDDEN', label: 'Hidden' },
  { value: 'REMOVED', label: 'Removed' },
]

const STATUS_BADGE: Record<BulletinPostStatus, { tone: 'success' | 'danger' | 'neutral'; label: string }> = {
  PUBLISHED: { tone: 'success', label: 'Published' },
  HIDDEN: { tone: 'neutral', label: 'Hidden' },
  REMOVED: { tone: 'danger', label: 'Removed' },
}

type Pending = { kind: 'remove' | 'restore'; post: BulletinPost } | null

export function ModerationPostsPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? '') as BulletinPostStatus | ''
  const [pending, setPending] = useState<Pending>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, error, loading, reload } = useLoad(
    () => moderationApi.posts({ status, announcements: false }),
    [status],
  )

  function setStatus(value: string) {
    const merged = new URLSearchParams(params)
    if (value) merged.set('status', value)
    else merged.delete('status')
    setParams(merged, { replace: true })
  }

  async function runRemove(report: ActionReport) {
    if (!pending) return
    await moderationApi.removePost(pending.post.bulletinPostId, report)
    setNotice(`"${pending.post.title}" was taken down. Your report was sent to the author.`)
    reload()
  }

  async function runPending() {
    if (!pending) return
    const { kind, post } = pending
    if (kind === 'restore') {
      await moderationApi.restorePost(post.bulletinPostId)
      setNotice(`"${post.title}" is back on the bulletin board.`)
    }
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="sm:max-w-xs">
        <Select id="post-status" label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
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

      {data && data.length === 0 && <EmptyState title="No posts found" description="Try a different status." />}

      {data && data.length > 0 && (
        <>
          <p className="text-sm text-fg-muted">
            {data.length} {data.length === 1 ? 'post' : 'posts'}
          </p>
          <ListCard>
            {data.map(({ post, author }) => {
              const badge = STATUS_BADGE[post.status]
              return (
                <li key={post.bulletinPostId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{post.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm break-words text-fg-muted">{post.content}</p>
                    <p className="mt-1 text-xs text-fg-subtle">
                      <Link to={`/profile/${post.authorId}`} className="font-medium hover:underline">
                        {author?.name ?? `User #${post.authorId}`}
                      </Link>
                      {' · '}
                      <time dateTime={post.createdAt}>{formatRelativeTime(post.createdAt)}</time>
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      <Badge>{CATEGORY_LABELS[post.category]}</Badge>
                    </div>
                  </div>
                  {post.status === 'REMOVED' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="sm:w-auto"
                      onClick={() => setPending({ kind: 'restore', post })}
                    >
                      <ArrowCounterClockwise aria-hidden="true" className="size-4" />
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="sm:w-auto"
                      onClick={() => setPending({ kind: 'remove', post })}
                    >
                      <Trash aria-hidden="true" className="size-4" />
                      Remove
                    </Button>
                  )}
                </li>
              )
            })}
          </ListCard>
        </>
      )}

      <ActionReportDialog
        open={pending?.kind === 'remove'}
        action="POST_REMOVED"
        title="Remove this post?"
        description={
          <>
            <strong>{pending?.post.title}</strong> will disappear from the bulletin board, and the author gets
            your report by notification and email. You can restore it later.
          </>
        }
        confirmLabel="Remove post"
        onClose={() => setPending(null)}
        onConfirm={runRemove}
      />
      <ConfirmDialog
        open={pending?.kind === 'restore'}
        tone="primary"
        title="Restore this post?"
        description={`"${pending?.post.title ?? ''}" will be published again.`}
        confirmLabel="Restore post"
        onClose={() => setPending(null)}
        onConfirm={runPending}
      />
    </div>
  )
}
