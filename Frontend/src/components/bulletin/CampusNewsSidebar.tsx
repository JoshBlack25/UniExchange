/*
  "Campus News" card for the bulletin's right rail (xl and up): the five most
  recent faculty announcements. Below xl it is not shown - announcements are
  already pinned to the top of the feed itself, so nothing is lost.
*/

import { Megaphone } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

import { Card } from '@/components/ui/Card'
import { bulletinApi } from '@/lib/api/bulletin'
import type { BulletinPost } from '@/lib/api/types'

import { formatRelativeTime } from './relativeTime'

const MAX_ITEMS = 5

export function CampusNewsSidebar() {
  const [posts, setPosts] = useState<BulletinPost[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void bulletinApi
      .announcements()
      .then((results) => {
        if (cancelled) return
        const sorted = [...results]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_ITEMS)
        setPosts(sorted)
      })
      .catch(() => {
        if (!cancelled) setPosts([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
        <span className="grid size-8 place-items-center rounded-full bg-brand-50 text-brand-700">
          <Megaphone aria-hidden="true" weight="fill" className="size-4" />
        </span>
        Campus news
      </h2>

      {posts === null && (
        <div aria-hidden="true" className="mt-4 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2 border-l-2 border-line pl-3">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
            </div>
          ))}
        </div>
      )}

      {posts !== null && posts.length === 0 && (
        <p className="mt-3 text-sm text-fg-muted">No announcements right now.</p>
      )}

      {posts !== null && posts.length > 0 && (
        <ul className="mt-4 space-y-4">
          {posts.map((post) => (
            <li key={post.bulletinPostId} className="border-l-2 border-brand-500 pl-3">
              <p className="text-sm font-semibold leading-snug text-fg">{post.title}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{post.content}</p>
              <time dateTime={post.createdAt} className="mt-1 block text-xs text-fg-muted">
                {formatRelativeTime(post.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
