/*
  Campus announcements: the official posts shown in Campus News. Only
  moderators and admins can write them; students cannot mark their own posts as
  announcements (the backend ignores the flag).

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { zodResolver } from '@hookform/resolvers/zod'
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/components/bulletin/categoryLabels'
import { formatRelativeTime } from '@/components/bulletin/relativeTime'
import { ConfirmDialog, ListCard, ListSkeleton } from '@/components/moderation/ModerationUi'
import { errorMessage, useLoad } from '@/components/moderation/useLoad'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { Select } from '@/components/ui/Select'
import { Sheet } from '@/components/ui/Sheet'
import { Textarea } from '@/components/ui/Textarea'
import { TextField } from '@/components/ui/TextField'
import { moderationApi } from '@/lib/api/moderation'
import type { BulletinPost } from '@/lib/api/types'
import { announcementSchema } from '@/lib/schemas'
import type { AnnouncementValues } from '@/lib/schemas'

const EMPTY: AnnouncementValues = { title: '', content: '', category: 'GENERAL' }

/** null = closed, 'new' = composing, a post = editing it. */
type Editing = BulletinPost | 'new' | null

export function ModerationAnnouncementsPage() {
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<BulletinPost | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, error, loading, reload } = useLoad(() => moderationApi.announcements(), [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Announcements appear in Campus News for every student.</p>
        <Button size="sm" className="w-auto" onClick={() => setEditing('new')}>
          <Plus aria-hidden="true" weight="bold" className="size-4" />
          New announcement
        </Button>
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      {loading && !data && <ListSkeleton rows={3} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No announcements yet"
          description="Post one to tell every student about campus news or events."
        />
      )}

      {data && data.length > 0 && (
        <ListCard>
          {data.map(({ post, author }) => (
            <li key={post.bulletinPostId} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold break-words text-fg">{post.title}</p>
                <p className="mt-0.5 line-clamp-3 text-sm break-words whitespace-pre-line text-fg-muted">
                  {post.content}
                </p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {author?.name ?? 'A moderator'} ·{' '}
                  <time dateTime={post.createdAt}>{formatRelativeTime(post.createdAt)}</time>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge>{CATEGORY_LABELS[post.category]}</Badge>
                  {post.status === 'HIDDEN' && <Badge tone="neutral">Hidden</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton tone="plain" label={`Edit "${post.title}"`} onClick={() => setEditing(post)}>
                  <PencilSimple aria-hidden="true" className="size-5" />
                </IconButton>
                <IconButton tone="plain" label={`Delete "${post.title}"`} onClick={() => setDeleting(post)}>
                  <Trash aria-hidden="true" className="size-5" />
                </IconButton>
              </div>
            </li>
          ))}
        </ListCard>
      )}

      <AnnouncementSheet
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={(post, created) => {
          setEditing(null)
          setNotice(created ? `"${post.title}" is now in Campus News.` : `Saved "${post.title}".`)
          reload()
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this announcement?"
        description={
          <>
            <strong>{deleting?.title}</strong> will be taken out of Campus News.
          </>
        }
        confirmLabel="Delete announcement"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          await moderationApi.deleteAnnouncement(deleting.bulletinPostId)
          setNotice(`"${deleting.title}" was deleted.`)
          reload()
        }}
      />
    </div>
  )
}

function AnnouncementSheet({
  editing,
  onClose,
  onSaved,
}: {
  editing: Editing
  onClose: () => void
  onSaved: (post: BulletinPost, created: boolean) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementValues>({ resolver: zodResolver(announcementSchema), defaultValues: EMPTY })

  // Clear the last attempt's error whenever the sheet opens on something new.
  const [openedFor, setOpenedFor] = useState(editing)
  if (editing !== openedFor) {
    setOpenedFor(editing)
    if (editing !== null) setFormError(null)
  }

  useEffect(() => {
    if (editing === null) return
    reset(
      editing === 'new'
        ? EMPTY
        : { title: editing.title, content: editing.content, category: editing.category },
    )
  }, [editing, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (editing === null) return
    setFormError(null)
    try {
      const saved =
        editing === 'new'
          ? await moderationApi.createAnnouncement(values)
          : await moderationApi.updateAnnouncement(editing.bulletinPostId, values)
      onSaved(saved, editing === 'new')
    } catch (caught) {
      setFormError(errorMessage(caught))
    }
  })

  return (
    <Sheet
      open={editing !== null}
      onClose={onClose}
      dismissible={!isSubmitting}
      title={editing === 'new' ? 'New announcement' : 'Edit announcement'}
      description="Shown in Campus News to every student."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="sm:w-auto" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="announcement-form" className="sm:w-auto" loading={isSubmitting}>
            {editing === 'new' ? 'Publish' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <form id="announcement-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <TextField label="Title" maxLength={150} error={errors.title?.message} {...register('title')} />
        <Select id="announcement-category" label="Category" error={errors.category?.message} {...register('category')}>
          {ALL_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </Select>
        <Textarea label="Announcement" rows={6} error={errors.content?.message} {...register('content')} />
      </form>
    </Sheet>
  )
}
