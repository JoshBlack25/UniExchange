/*
  The inbox: every conversation, newest first, in one glass card.

  Rendered by BOTH message routes, which is what makes the Messenger layout:
    - MessagesPage (/messages) shows it on its own below lg, and as the left
      pane next to a "Select a conversation" placeholder from lg.
    - ChatPage (/messages/:id) shows it as the left pane from lg only, with
      `activeId` highlighting the open thread.

  One request, not N+1. The backend's /api/chat/threads assembles the other
  participant, the listing, the last message and the unread count server-side,
  because the domain has no JPA relationships and doing it here would mean three
  extra round trips per row.

  The search box filters what is already loaded (name, listing, last message) -
  there is no search endpoint and an inbox is small enough not to need one.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { ChatsCircle, MagnifyingGlass, Tag, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { chatApi } from '@/lib/api/chat'
import { ApiError } from '@/lib/api/client'
import type { ChatThreadView } from '@/lib/api/types'

/** Slow: this is the inbox, not an open thread, so it does not need to feel live. */
const POLL_MS = 15_000

type ConversationListProps = {
  /** The open thread, highlighted in the two-pane layout. */
  activeId?: number
  /** h1 when the list IS the page (/messages), h2 when it sits beside a chat. */
  titleAs?: 'h1' | 'h2'
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const minutes = Math.round((Date.now() - then) / 60_000)

  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d`
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function nameOf(thread: ChatThreadView): string {
  return thread.otherParticipant
    ? `${thread.otherParticipant.firstName} ${thread.otherParticipant.lastName}`
    : 'Unknown student'
}

export function ConversationList({ activeId, titleAs: Title = 'h1' }: ConversationListProps) {
  const [threads, setThreads] = useState<ChatThreadView[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const results = await chatApi.threads()
      if (!signal?.cancelled) {
        setThreads(results)
        setError(null)
      }
    } catch (err: unknown) {
      if (!signal?.cancelled) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      }
    }
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }

    // Inline promise chain for the first load rather than calling load()
    // directly: setState in an effect body trips react-hooks/set-state-in-effect,
    // and this is the shape the rest of the app already uses. The interval below
    // can call load() freely, because a timer callback is not the effect body.
    chatApi
      .threads()
      .then((results) => {
        if (!signal.cancelled) {
          setThreads(results)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!signal.cancelled) {
          setError(err instanceof ApiError ? err.message : 'Something went wrong.')
        }
      })

    const interval = window.setInterval(() => {
      // Polling a hidden tab is pure waste - and on a phone the browser throttles
      // it to seconds-to-minutes anyway, so the data would be stale regardless.
      if (!document.hidden) void load(signal)
    }, POLL_MS)

    const onFocus = () => void load(signal)
    window.addEventListener('focus', onFocus)

    return () => {
      signal.cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!threads || !needle) return threads
    return threads.filter((thread) =>
      [nameOf(thread), thread.listingTitle ?? '', thread.lastMessagePreview ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [threads, query])

  const totalUnread = threads?.reduce((sum, thread) => sum + thread.unreadCount, 0) ?? 0

  return (
    <section
      aria-label="Conversations"
      className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-glass"
    >
      <div className="space-y-3 px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Title className="text-2xl font-bold tracking-tight text-fg">Chats</Title>
          {totalUnread > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-on-primary">
              {totalUnread} new
            </span>
          )}
        </div>

        {threads && threads.length > 0 && (
          <div className="relative">
            <MagnifyingGlass
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-fg-subtle"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              className={
                'block min-h-11 w-full rounded-full border border-transparent bg-surface-muted py-2 pl-11 pr-11 text-sm text-fg ' +
                'placeholder:text-fg-subtle transition hover:border-line focus:border-brand-500 focus:outline-2 focus:outline-brand-500/30 ' +
                '[&::-webkit-search-cancel-button]:hidden'
              }
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-fg-muted hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 scrollbar-thin">
        {error && (
          <div className="px-2 pb-2">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        {threads === null && !error && <ListSkeleton />}

        {threads?.length === 0 && (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-700">
              <ChatsCircle aria-hidden="true" className="size-7" />
            </span>
            <p className="mt-3 text-sm font-semibold text-fg">No conversations yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-fg-muted">
              Open a listing and tap Message Seller to start one.
            </p>
          </div>
        )}

        {visible && visible.length === 0 && threads && threads.length > 0 && (
          <p className="px-4 py-10 text-center text-sm text-fg-muted">
            No chats match &ldquo;{query.trim()}&rdquo;.
          </p>
        )}

        {visible && visible.length > 0 && (
          <ul className="space-y-0.5">
            {visible.map((thread) => (
              <ConversationRow
                key={thread.conversationId}
                thread={thread}
                active={thread.conversationId === activeId}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function ConversationRow({ thread, active }: { thread: ChatThreadView; active: boolean }) {
  const name = nameOf(thread)
  const unread = thread.unreadCount > 0

  return (
    <li>
      <Link
        to={`/messages/${thread.conversationId}`}
        aria-current={active ? 'page' : undefined}
        className={
          'flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition active:scale-[0.99] ' +
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 ' +
          (active ? 'bg-brand-50' : 'hover:bg-surface-muted')
        }
      >
        <Avatar name={name} className="size-12" />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-[0.9375rem] text-fg ${unread ? 'font-bold' : 'font-medium'}`}>
              {name}
            </span>
            <span
              className={`shrink-0 text-xs tabular-nums ${unread ? 'font-semibold text-brand-700' : 'text-fg-muted'}`}
            >
              {relativeTime(thread.lastMessageAt)}
            </span>
          </span>

          <span className="mt-0.5 flex items-center gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-sm ${unread ? 'font-semibold text-fg' : 'text-fg-muted'}`}
            >
              {thread.lastMessagePreview ?? 'No messages yet'}
            </span>
            {unread && (
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold tabular-nums text-on-primary">
                {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                <span className="sr-only"> unread</span>
              </span>
            )}
          </span>

          {thread.listingTitle && (
            <span className="mt-1 flex items-center gap-1 text-xs text-brand-700">
              <Tag aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{thread.listingTitle}</span>
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}

function ListSkeleton() {
  return (
    <ul aria-hidden="true" className="space-y-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-2.5 py-2.5">
          <span className="size-12 shrink-0 animate-pulse rounded-full bg-surface-muted" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-2/5 animate-pulse rounded-full bg-surface-muted" />
            <span className="block h-3 w-4/5 animate-pulse rounded-full bg-surface-muted" />
          </span>
        </li>
      ))}
    </ul>
  )
}
