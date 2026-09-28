/*
  Campus bulletin board.

  OWNER: Aidan Barends (230255639)
  ROUTE: /bulletin

  IMPORTANT - the team's mockup for this page still shows more than the
  backend supports: NO likes entity, NO comments entity, NO tags entity.
  What IS real: BulletinPost has a category field (see BulletinPostCategory
  in types.ts) - Filter Feed, the composer's category picker, and each
  post's category badge are all wired to it. Posts can also carry one real
  photo (BulletinPostImage), added either by pasting a URL or uploading a
  file through UploadController - see PostComposer's Photo toggle and this
  page's postImages map. None of the rest (likes/comments/tags) is built.

  NOTE: you POST `isFacultyAnnouncement` but the response comes back as
  `facultyAnnouncement` (Jackson strips the `is` prefix on boolean getters) -
  see the comment in src/lib/api/types.ts.

  status is PUBLISHED | HIDDEN | REMOVED - the backend returns all of them
  from both GET /api/bulletin-posts and GET .../category/:category, so
  PUBLISHED-only filtering happens here either way.

  Your own components go in src/components/bulletin/.

  LAYOUT (Facebook news feed): a centred ~680px column (Columns narrow) with
  a collapsed "What's on your mind?" card that expands into PostComposer in
  place, the category filter as a chip row (below xl), then the posts. From xl
  the right rail holds FilterFeedSidebar (same filter state as the chips) and
  CampusNewsSidebar.
*/

import { ImageSquare, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'

import { useIsModerator } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { CampusNewsSidebar } from '@/components/bulletin/CampusNewsSidebar'
import { CategoryFilterChips } from '@/components/bulletin/CategoryFilterChips'
import { FilterFeedSidebar } from '@/components/bulletin/FilterFeedSidebar'
import { PostCard } from '@/components/bulletin/PostCard'
import { PostCardSkeleton } from '@/components/bulletin/PostCardSkeleton'
import { PostComposer } from '@/components/bulletin/PostComposer'
import { formatRelativeTime } from '@/components/bulletin/relativeTime'
import { Columns } from '@/components/layout/Columns'
import { PageHeader } from '@/components/layout/PageHeader'
import { Seo } from '@/components/seo/Seo'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { bulletinApi } from '@/lib/api/bulletin'
import { ApiError } from '@/lib/api/client'
import { moderationApi } from '@/lib/api/moderation'
import type { ActionReport, BulletinPost, BulletinPostCategory, BulletinPostImage, User } from '@/lib/api/types'
import { usersApi } from '@/lib/api/users'
import type { BulletinPostValues } from '@/lib/schemas'

function sortPosts(posts: BulletinPost[]): BulletinPost[] {
  return [...posts].sort((a, b) => {
    if (a.facultyAnnouncement !== b.facultyAnnouncement) {
      return a.facultyAnnouncement ? -1 : 1
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; posts: BulletinPost[] }

export function BulletinPage() {
  const { user } = useAuth()
  const isModerator = useIsModerator()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [authors, setAuthors] = useState<Map<number, User>>(new Map())
  const [postImages, setPostImages] = useState<Map<number, BulletinPostImage>>(new Map())
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<BulletinPostCategory | null>(null)
  /* The composer card starts collapsed; 'photo' opens it with the photo picker showing. */
  const [composer, setComposer] = useState<'closed' | 'open' | 'photo'>('closed')

  const load = useCallback(async (category: BulletinPostCategory | null) => {
    setState({ status: 'loading' })

    let posts: BulletinPost[]
    try {
      posts = category === null ? await bulletinApi.list() : await bulletinApi.byCategory(category)
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof ApiError ? error.message : 'Something went wrong.',
      })
      return
    }

    const published = sortPosts(posts.filter((post) => post.status === 'PUBLISHED'))

    setState({ status: 'ready', posts: published })

    const uniqueAuthorIds = [...new Set(published.map((post) => post.authorId))]
    void Promise.all(uniqueAuthorIds.map((id) => usersApi.byId(id).catch(() => null))).then((users) => {
      setAuthors((previous) => {
        const next = new Map(previous)
        users.forEach((user, index) => {
          if (user) next.set(uniqueAuthorIds[index], user)
        })
        return next
      })
    })

    void Promise.all(
      published.map((post) => bulletinApi.imagesFor(post.bulletinPostId).catch(() => [])),
    ).then((imageLists) => {
      setPostImages((previous) => {
        const next = new Map(previous)
        imageLists.forEach((images, index) => {
          const primary = images.find((image) => image.primary) ?? images[0]
          if (primary) next.set(published[index].bulletinPostId, primary)
        })
        return next
      })
    })
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => load(selectedCategory))
  }, [selectedCategory, load])

  const handleCreatePost = async (values: BulletinPostValues) => {
    if (!user) return

    const created = await bulletinApi.create({
      authorId: user.userId,
      title: values.title,
      content: values.content,
      status: 'PUBLISHED',
      isFacultyAnnouncement: false,
      category: values.category,
    })

    if (selectedCategory === null || created.category === selectedCategory) {
      setState((previous) => ({
        status: 'ready',
        posts: sortPosts(previous.status === 'ready' ? [created, ...previous.posts] : [created]),
      }))
    }

    setAuthors((previous) => new Map(previous).set(user.userId, user))

    if (values.imageUrl) {
      const image = await bulletinApi.addImage({
        bulletinPostId: created.bulletinPostId,
        imageUrl: values.imageUrl,
        position: 0,
        isPrimary: true,
      })
      setPostImages((previous) => new Map(previous).set(created.bulletinPostId, image))
    }
  }

  const handleUpdatePost = async (post: BulletinPost, values: BulletinPostValues) => {
    if (!user || user.userId !== post.authorId) {
      throw new Error('Only the author can edit this post.')
    }

    const updated = await bulletinApi.update(post.bulletinPostId, {
      authorId: post.authorId,
      title: values.title,
      content: values.content,
      status: post.status,
      isFacultyAnnouncement: post.facultyAnnouncement,
      category: values.category,
    })

    setState((previous) => {
      if (previous.status !== 'ready') return { status: 'ready', posts: [updated] }

      if (selectedCategory !== null && updated.category !== selectedCategory) {
        return {
          status: 'ready',
          posts: previous.posts.filter((p) => p.bulletinPostId !== updated.bulletinPostId),
        }
      }

      return {
        status: 'ready',
        posts: sortPosts(previous.posts.map((p) => (p.bulletinPostId === updated.bulletinPostId ? updated : p))),
      }
    })

    const existingImage = postImages.get(updated.bulletinPostId)
    if (values.imageUrl) {
      const image = existingImage
        ? await bulletinApi.updateImage(existingImage.imageId, {
            bulletinPostId: updated.bulletinPostId,
            imageUrl: values.imageUrl,
            position: 0,
            isPrimary: true,
          })
        : await bulletinApi.addImage({
            bulletinPostId: updated.bulletinPostId,
            imageUrl: values.imageUrl,
            position: 0,
            isPrimary: true,
          })
      setPostImages((previous) => new Map(previous).set(updated.bulletinPostId, image))
    } else if (existingImage) {
      await bulletinApi.removeImage(existingImage.imageId)
      setPostImages((previous) => {
        const next = new Map(previous)
        next.delete(updated.bulletinPostId)
        return next
      })
    }
  }

  const handleDeletePost = async (post: BulletinPost) => {
    if (!user || user.userId !== post.authorId) {
      setActionError('Only the author can delete this post.')
      return
    }

    try {
      await bulletinApi.remove(post.bulletinPostId)
      setState((previous) =>
        previous.status === 'ready'
          ? { status: 'ready', posts: previous.posts.filter((p) => p.bulletinPostId !== post.bulletinPostId) }
          : previous,
      )
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not delete this post.')
    }
  }

  /* A moderator taking down someone else's post. Errors surface in the reason dialog. */
  const handleModeratePost = async (post: BulletinPost, report: ActionReport) => {
    await moderationApi.removePost(post.bulletinPostId, report)
    setState((previous) =>
      previous.status === 'ready'
        ? { status: 'ready', posts: previous.posts.filter((p) => p.bulletinPostId !== post.bulletinPostId) }
        : previous,
    )
  }

  const firstName = user?.firstName ?? null
  const myName = user ? `${user.firstName} ${user.lastName}` : null

  return (
    <Columns
      narrow
      asideLabel="Bulletin filters and campus news"
      aside={
        <>
          <FilterFeedSidebar selected={selectedCategory} onSelect={setSelectedCategory} />
          <CampusNewsSidebar />
        </>
      }
    >
      <Seo
        title="Campus bulletin"
        description="Events, study groups, lost and found and notices from around your CPUT campus."
        path="/bulletin"
        noindex
      />
      <PageHeader title="Campus bulletin" subtitle="Announcements, events and notices from campus" />

      <div className="space-y-4">
        {/* Composer: collapsed to a Facebook-style prompt until tapped. */}
        <Card padding="none">
          <section aria-labelledby="composer-heading">
            {composer === 'closed' ? (
              <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
                <h2 id="composer-heading" className="sr-only">
                  Create a post
                </h2>
                <Avatar name={myName} className="size-10" />
                <button
                  type="button"
                  onClick={() => setComposer('open')}
                  className={
                    'min-h-11 min-w-0 flex-1 truncate rounded-full bg-surface-muted px-3.5 text-left text-sm text-fg-muted sm:text-[0.9375rem] ' +
                    'transition hover:bg-gray-200 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
                  }
                >
                  {firstName ? `What's on your mind, ${firstName}?` : "What's on your mind?"}
                </button>
                <IconButton label="Add a photo" tone="plain" onClick={() => setComposer('photo')}>
                  <ImageSquare weight="fill" aria-hidden="true" className="size-6 text-emerald-600" />
                </IconButton>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
                  <h2 id="composer-heading" className="flex-1 text-base font-semibold text-fg">
                    Create post
                  </h2>
                  <IconButton label="Close composer" size="sm" onClick={() => setComposer('closed')}>
                    <X aria-hidden="true" className="size-5" />
                  </IconButton>
                </div>
                <div className="p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <Avatar name={myName} className="size-10" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">{myName ?? 'You'}</p>
                      <p className="text-xs text-fg-muted">Posting to the campus bulletin</p>
                    </div>
                  </div>
                  <PostComposer
                    autoFocus
                    startWithPhoto={composer === 'photo'}
                    onCancel={() => setComposer('closed')}
                    onSubmit={async (values) => {
                      await handleCreatePost(values)
                      setComposer('closed')
                    }}
                  />
                </div>
              </div>
            )}
          </section>
        </Card>

        <CategoryFilterChips selected={selectedCategory} onSelect={setSelectedCategory} className="xl:hidden" />

        {actionError && <Alert>{actionError}</Alert>}

        {state.status === 'loading' && (
          <div role="status" aria-label="Loading bulletin" className="space-y-4">
            <PostCardSkeleton />
            <PostCardSkeleton withImage />
          </div>
        )}

        {state.status === 'error' && (
          <EmptyState
            title="Couldn't load the bulletin"
            description={state.message}
            action={
              <Button variant="secondary" className="w-auto" onClick={() => void load(selectedCategory)}>
                Try again
              </Button>
            }
          />
        )}

        {state.status === 'ready' && state.posts.length === 0 && (
          <EmptyState
            title={selectedCategory === null ? 'Nothing posted yet' : 'Nothing in this category yet'}
            description={
              selectedCategory === null
                ? 'Be the first to share something with the campus.'
                : 'Try a different filter, or be the first to post here.'
            }
            action={
              selectedCategory !== null ? (
                <Button variant="secondary" className="w-auto" onClick={() => setSelectedCategory(null)}>
                  Show all posts
                </Button>
              ) : undefined
            }
          />
        )}

        {state.status === 'ready' &&
          state.posts.map((post) => {
            const author = authors.get(post.authorId)
            const authorName = author ? `${author.firstName} ${author.lastName}` : null
            const isOwner = user?.userId === post.authorId
            const imageUrl = postImages.get(post.bulletinPostId)?.imageUrl ?? null

            return (
              <PostCard
                key={post.bulletinPostId}
                post={post}
                authorName={authorName}
                imageUrl={imageUrl}
                isOwner={isOwner}
                formatRelativeTime={formatRelativeTime}
                onSave={(values) => handleUpdatePost(post, values)}
                onDelete={() => handleDeletePost(post)}
                canModerate={isModerator}
                onModerate={(report) => handleModeratePost(post, report)}
              />
            )
          })}
      </div>
    </Columns>
  )
}
