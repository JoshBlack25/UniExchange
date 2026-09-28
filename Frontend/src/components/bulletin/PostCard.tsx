/*
  One bulletin post, laid out like a Facebook news-feed post:

    header   avatar · author (links to their profile) · time · Announcement
             badge · "..." menu (owner: Edit / Delete; anyone else: Report;
             moderator session on someone else's post: Remove, with a report)
    body     title + text
    image    full-bleed, edge to edge inside the card
    footer   category, and "Edited" when the post changed after publishing

  Faculty announcements get a brand accent stripe along the top and a tinted
  ring so they read as official at a glance.

  Delete always asks first, in a small dialog, and the destructive button is
  the only red thing on it.
*/

import { DotsThree, Flag, Megaphone, PencilSimple, ShieldWarning, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { BulletinCategoryIcon } from '@/components/bulletin/CategoryIcon'
import { CATEGORY_LABELS } from '@/components/bulletin/categoryLabels'
import { PostComposer } from '@/components/bulletin/PostComposer'
import { ActionReportDialog } from '@/components/moderation/ActionReportDialog'
import { ReportDialog } from '@/components/reports/ReportDialog'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/Menu'
import { Sheet } from '@/components/ui/Sheet'
import type { ActionReport, BulletinPost } from '@/lib/api/types'
import type { BulletinPostValues } from '@/lib/schemas'
import { safeUrl } from '@/lib/safeUrl'

type PostCardProps = {
  post: BulletinPost
  authorName: string | null
  imageUrl: string | null
  isOwner: boolean
  formatRelativeTime: (iso: string) => string
  onSave: (values: BulletinPostValues) => Promise<void>
  onDelete: () => Promise<void>
  /** True in a moderator or admin session. Only used on other people's posts. */
  canModerate?: boolean
  /** Takes the post down as a moderator. Throw to keep the dialog open with the error. */
  onModerate?: (report: ActionReport) => Promise<void>
}

const absoluteFormatter = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'full', timeStyle: 'short' })

/* A minute of slack so the create request's own timestamps don't count as an edit. */
const EDIT_THRESHOLD_MS = 60_000

export function PostCard({
  post,
  authorName,
  imageUrl,
  isOwner,
  formatRelativeTime,
  onSave,
  onDelete,
  canModerate = false,
  onModerate,
}: PostCardProps) {
  const [editing, setEditing] = useState(false)
  const [moderating, setModerating] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const safeImageUrl = safeUrl(imageUrl)

  const profileHref = isOwner ? '/profile' : `/profile/${post.authorId}`
  const showModerate = canModerate && !isOwner && onModerate !== undefined
  // Anyone may report someone else's post; announcements are moderators' own notices.
  const showReport = !isOwner && !post.facultyAnnouncement
  const edited = new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > EDIT_THRESHOLD_MS

  const header = (
    <div className="flex items-start gap-3 px-4 pt-4">
      <Link
        to={profileHref}
        className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        aria-label={`${authorName ?? 'Author'}'s profile`}
      >
        <Avatar name={authorName} className="size-10" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={profileHref}
            className="truncate text-[0.9375rem] font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            {authorName ?? 'Someone'}
          </Link>
          {post.facultyAnnouncement && (
            <Badge tone="brand">
              <Megaphone aria-hidden="true" weight="fill" className="size-3.5" />
              Announcement
            </Badge>
          )}
        </div>
        <time
          dateTime={post.createdAt}
          title={absoluteFormatter.format(new Date(post.createdAt))}
          className="text-xs text-fg-muted"
        >
          {formatRelativeTime(post.createdAt)}
        </time>
      </div>

      {(isOwner || showModerate || showReport) && !editing && (
        <div className="-mr-2 -mt-1.5">
          <Menu
            label="Post options"
            triggerClassName="grid size-11 place-items-center text-fg-muted hover:bg-surface-muted hover:text-fg"
            trigger={<DotsThree aria-hidden="true" weight="bold" className="size-6" />}
          >
            {isOwner && (
              <>
                <MenuItem icon={<PencilSimple />} onSelect={() => setEditing(true)}>
                  Edit post
                </MenuItem>
                <MenuSeparator />
                <MenuItem icon={<Trash />} tone="danger" onSelect={() => setConfirmingDelete(true)}>
                  Delete post
                </MenuItem>
              </>
            )}
            {showReport && (
              <MenuItem icon={<Flag />} onSelect={() => setReporting(true)}>
                Report post
              </MenuItem>
            )}
            {showModerate && (
              <>
                <MenuSeparator />
                <MenuItem icon={<ShieldWarning />} tone="danger" onSelect={() => setModerating(true)}>
                  Remove (moderator)
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      )}
    </div>
  )

  /* Accent stripe for faculty announcements - decorative, the badge carries the meaning. */
  const stripe = post.facultyAnnouncement && (
    <div aria-hidden="true" className="h-1 rounded-t-2xl bg-linear-to-r from-brand-500 via-cyan-500 to-teal-400" />
  )
  const cardClass = post.facultyAnnouncement ? 'border-brand-200!' : ''

  if (editing) {
    return (
      <Card padding="none" className={cardClass}>
        {stripe}
        {header}
        <div className="p-4">
          <PostComposer
            initialValues={{
              title: post.title,
              content: post.content,
              category: post.category,
              imageUrl: imageUrl ?? '',
            }}
            submitLabel="Save"
            autoFocus
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              await onSave(values)
              setEditing(false)
            }}
          />
        </div>
      </Card>
    )
  }

  return (
    <Card padding="none" className={cardClass}>
      <article aria-labelledby={`post-${post.bulletinPostId}-title`}>
        {stripe}
        {header}

        <div className="px-4 pt-3">
          <h2 id={`post-${post.bulletinPostId}-title`} className="text-base font-semibold leading-snug text-fg">
            {post.title}
          </h2>
          <p className="mt-1 whitespace-pre-wrap wrap-break-word text-[0.9375rem] leading-relaxed text-fg">
            {post.content}
          </p>
        </div>

        {safeImageUrl && !imageFailed && (
          <img
            src={safeImageUrl}
            alt={post.title ? post.title : `Photo attached to ${authorName ?? 'a student'}'s post`}
            loading="lazy"
            className="mt-3 max-h-128 w-full border-y border-line bg-surface-muted object-cover"
            onError={() => setImageFailed(true)}
          />
        )}

        <div
          className={
            'mx-4 flex items-center gap-3 py-3 text-xs font-medium text-fg-muted ' +
            (safeImageUrl && !imageFailed ? '' : 'mt-3 border-t border-line')
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <BulletinCategoryIcon category={post.category} className="size-4" />
            {CATEGORY_LABELS[post.category]}
          </span>
          {edited && (
            <>
              <span aria-hidden="true">·</span>
              <span>Edited</span>
            </>
          )}
        </div>
      </article>

      <Sheet
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        variant="dialog"
        dismissible={!deleting}
        title="Delete this post?"
        description="It will be removed from the campus bulletin for everyone. This can't be undone."
        footer={
          <>
            <Button
              variant="secondary"
              className="sm:w-auto"
              disabled={deleting}
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="sm:w-auto"
              loading={deleting}
              onClick={async () => {
                setDeleting(true)
                try {
                  await onDelete()
                } finally {
                  setDeleting(false)
                  setConfirmingDelete(false)
                }
              }}
            >
              <Trash aria-hidden="true" className="size-4" />
              Delete post
            </Button>
          </>
        }
      >
        <div className="rounded-xl border border-line bg-surface-muted/60 p-3">
          <p className="text-sm font-semibold text-fg">{post.title}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{post.content}</p>
        </div>
      </Sheet>

      {showModerate && (
        <ActionReportDialog
          open={moderating}
          action="POST_REMOVED"
          title="Remove this post?"
          description={
            <>
              <strong>{post.title}</strong> will disappear from the bulletin board, and{' '}
              {authorName ?? 'the author'} gets your report by notification and email. You can restore it from
              Moderation.
            </>
          }
          confirmLabel="Remove post"
          onClose={() => setModerating(false)}
          onConfirm={(report) => onModerate(report)}
        />
      )}
      {showReport && (
        <ReportDialog
          open={reporting}
          onClose={() => setReporting(false)}
          targetType="BULLETIN_POST"
          targetId={post.bulletinPostId}
          targetName={post.title}
        />
      )}
    </Card>
  )
}
