/*
  A single conversation thread.

  ROUTE: /messages/:conversationId

  Polling, not websockets - the backend has none, deliberately (Azure App
  Service's cheap tiers unload an idle app and drop persistent connections).
  Each poll passes the highest messageId already held, so the common case is an
  empty array rather than the whole thread.

  The thread body is a separate component with key={threadId}. Navigating from
  one conversation to another then remounts it, so the messages, the poll cursor
  and the scroll position all reset by construction - rather than needing an
  effect that clears them, which is both easy to get wrong and the kind of
  synchronous setState that React now warns about.

  Layout (Messenger style):
    phone      the chat fills the screen between the TopBar and the BottomNav,
               edge to edge. The page itself never scrolls - only the messages
               do - so the composer stays pinned under the student's thumb.
    lg and up  the inbox (ConversationList) on the left, this chat on the right,
               same fixed-height panes as MessagesPage. The inbox is only
               mounted at lg, so phones don't run its poll in the background.
*/

import { ArrowLeft, ChatCircleDots, Tag } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ConversationList } from '@/components/messages/ConversationList'
import { MessageBubble } from '@/components/messages/MessageBubble'
import { MessageComposer } from '@/components/messages/MessageComposer'
import { useMediaQuery } from '@/components/messages/useMediaQuery'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PageHeader } from '@/components/layout/PageHeader'
import { Seo } from '@/components/seo/Seo'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/auth/useAuth'
import { chatApi } from '@/lib/api/chat'
import { ApiError } from '@/lib/api/client'
import type { ChatMessageView, ChatThreadView } from '@/lib/api/types'

const POLL_MS = 3_000

/** Consecutive messages from one sender closer together than this share a group. */
const GROUP_GAP_MS = 5 * 60_000

/*
  Height of the chat, per breakpoint, so it exactly fills the space between
  the chrome. The negative margins cancel <main>'s padding (AppLayout) on
  this page only (main keeps its tab-bar bottom padding until md); below sm
  they also cancel the side gutter, for an edge-to-edge chat like a native
  messenger.

    base   100dvh - TopBar 3.5rem - BottomNav 3.5rem + 1px border - safe area
    sm     100dvh - TopBar 4rem - padding-top 1.5rem - BottomNav 3.5rem + 1px - safe area
    md+    100dvh - TopBar 4rem - padding 1.5rem + 2.5rem (no BottomNav)
*/
const FILL_VIEWPORT =
  '-mx-3 -mt-4 mb-[calc(-5.5rem-env(safe-area-inset-bottom))] h-[calc(100dvh-7rem-1px-env(safe-area-inset-bottom))] ' +
  'sm:mx-0 sm:mt-0 sm:h-[calc(100dvh-9rem-1px-env(safe-area-inset-bottom))] ' +
  'md:mb-0 md:h-[calc(100dvh-8rem)]'

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const threadId = Number(conversationId)
  const twoPane = useMediaQuery('(min-width: 64rem)')

  if (!threadId) {
    return (
      <>
        <Seo title="Conversation not found" description="That conversation link does not look right." noindex />
        <PageHeader
          title="Chat"
          backTo="/messages"
          backLabel="Back to chats"
          breadcrumbs={[{ label: 'Messages', to: '/messages' }, { label: 'Chat' }]}
        />
        <EmptyState title="Conversation not found" description="That link does not look right." />
      </>
    )
  }

  return (
    <div className={`flex gap-4 ${FILL_VIEWPORT}`}>
      {twoPane && (
        <div className="flex w-80 shrink-0 flex-col xl:w-88">
          <ConversationList activeId={threadId} titleAs="h2" />
        </div>
      )}
      <ChatThread key={threadId} threadId={threadId} />
    </div>
  )
}

function dayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
}

function ChatThread({ threadId }: { threadId: number }) {
  const { session } = useAuth()
  const myUserId = session?.userId ?? 0

  const [messages, setMessages] = useState<ChatMessageView[] | null>(null)
  const [thread, setThread] = useState<ChatThreadView | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The poll cursor. A ref rather than state so advancing it never schedules a
  // render, and the interval closure always sees the current value.
  const cursorRef = useRef(0)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const hasScrolledRef = useRef(false)

  const poll = useCallback(
    async (signal: { cancelled: boolean }) => {
      try {
        const fresh = await chatApi.messagesSince(threadId, cursorRef.current)
        if (signal.cancelled) return

        if (fresh.length > 0) {
          cursorRef.current = fresh[fresh.length - 1].messageId
          setMessages((previous) => [...(previous ?? []), ...fresh])
          // Anything that arrives while the thread is open has been seen.
          void chatApi.markRead(threadId).catch(() => {})
        } else {
          // Distinguishes "loaded, empty" from "still loading".
          setMessages((previous) => previous ?? [])
        }
        setError(null)
      } catch (err: unknown) {
        if (!signal.cancelled) {
          setError(err instanceof ApiError ? err.message : 'Something went wrong.')
        }
      }
    },
    [threadId],
  )

  useEffect(() => {
    const signal = { cancelled: false }

    // Inline for the first load, so no setState happens in the effect body.
    chatApi
      .messagesSince(threadId, 0)
      .then((fresh) => {
        if (signal.cancelled) return
        if (fresh.length > 0) cursorRef.current = fresh[fresh.length - 1].messageId
        setMessages(fresh)
        void chatApi.markRead(threadId).catch(() => {})
      })
      .catch((err: unknown) => {
        if (!signal.cancelled) {
          setError(err instanceof ApiError ? err.message : 'Something went wrong.')
        }
      })

    // The thread list is the only place the other participant's name and the
    // listing title live, since a message carries neither.
    chatApi
      .threads()
      .then((all) => {
        if (!signal.cancelled) {
          setThread(all.find((candidate) => candidate.conversationId === threadId) ?? null)
        }
      })
      .catch(() => {})

    const interval = window.setInterval(() => {
      // Polling a hidden tab is waste, and mobile browsers throttle it anyway.
      if (!document.hidden) void poll(signal)
    }, POLL_MS)

    const onFocus = () => void poll(signal)
    window.addEventListener('focus', onFocus)

    return () => {
      signal.cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [poll, threadId])

  // Keep the newest message in view. Scrolls the message pane itself, not the
  // window: the first render jumps straight to the bottom, later arrivals
  // glide (unless the student asked for reduced motion).
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !messages) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior: hasScrolledRef.current && !reduce ? 'smooth' : 'auto',
    })
    hasScrolledRef.current = true
  }, [messages])

  const otherName = thread?.otherParticipant
    ? `${thread.otherParticipant.firstName} ${thread.otherParticipant.lastName}`
    : 'Conversation'

  return (
    <section
      aria-label={`Chat with ${otherName}`}
      className="glass-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-0 sm:rounded-2xl sm:border sm:shadow-glass"
    >
      <Seo
        title={thread?.otherParticipant ? `Chat with ${otherName}` : 'Chat'}
        description={
          thread?.listingTitle
            ? `Your conversation about "${thread.listingTitle}" on UniExchange.`
            : 'Your conversation on UniExchange.'
        }
        noindex
      />
      <header className="flex items-center gap-2 border-b border-line px-2 py-2 sm:px-3">
        <Link
          to="/messages"
          aria-label="Back to chats"
          className="grid size-11 shrink-0 place-items-center rounded-full text-fg-muted transition hover:bg-surface-muted hover:text-fg active:scale-95 focus-visible:outline-2 focus-visible:outline-brand-500 lg:hidden"
        >
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>

        <Avatar name={thread?.otherParticipant ? otherName : null} className="size-10 lg:ml-1" />

        <div className="min-w-0 flex-1">
          {/* Phones have the back arrow instead; the trail only shows beside the inbox. */}
          <div className="hidden lg:block [&_nav]:mb-0.5">
            <Breadcrumbs items={[{ label: 'Messages', to: '/messages' }, { label: otherName }]} />
          </div>
          <h1 className="truncate text-base font-semibold text-fg">{otherName}</h1>
          {thread?.listingTitle &&
            (thread.listingId ? (
              <Link
                to={`/listings/${thread.listingId}`}
                className="flex max-w-full items-center gap-1 rounded text-xs font-medium text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <Tag aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{thread.listingTitle}</span>
              </Link>
            ) : (
              <p className="flex items-center gap-1 text-xs text-fg-muted">
                <Tag aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{thread.listingTitle}</span>
              </p>
            ))}
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-thin sm:px-4"
      >
        {error && (
          <div className="mb-3">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        {messages === null && !error && <ThreadSkeleton />}

        {messages?.length === 0 && (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <Avatar name={thread?.otherParticipant ? otherName : null} className="mx-auto size-16" />
              <p className="mt-3 text-sm font-semibold text-fg">{otherName}</p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-fg-muted">
                <ChatCircleDots aria-hidden="true" className="size-4" />
                No messages yet. Say hello.
              </p>
            </div>
          </div>
        )}

        {messages && messages.length > 0 && (
          <ol aria-label="Messages" className="flex flex-col">
            {messages.map((message, index) => {
              const previous = messages[index - 1]
              const next = messages[index + 1]
              const newDay =
                !previous ||
                new Date(previous.sentAt).toDateString() !== new Date(message.sentAt).toDateString()
              const joinsPrevious =
                !newDay &&
                previous.senderId === message.senderId &&
                new Date(message.sentAt).getTime() - new Date(previous.sentAt).getTime() < GROUP_GAP_MS
              const joinsNext =
                !!next &&
                next.senderId === message.senderId &&
                new Date(next.sentAt).toDateString() === new Date(message.sentAt).toDateString() &&
                new Date(next.sentAt).getTime() - new Date(message.sentAt).getTime() < GROUP_GAP_MS

              return (
                <li key={message.messageId} className={joinsPrevious ? 'mt-0.5' : newDay ? '' : 'mt-3'}>
                  {newDay && (
                    <p className={`mb-3 text-center text-xs font-medium text-fg-muted ${index > 0 ? 'mt-5' : ''}`}>
                      {dayLabel(message.sentAt)}
                    </p>
                  )}
                  <MessageBubble
                    message={message}
                    mine={message.senderId === myUserId}
                    senderName={otherName}
                    first={!joinsPrevious}
                    last={!joinsNext}
                  />
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <MessageComposer
        conversationId={threadId}
        // Poll immediately after sending, so a message you sent and one you
        // received arrive through exactly the same path.
        onSent={() => void poll({ cancelled: false })}
      />
    </section>
  )
}

function ThreadSkeleton() {
  const rows = [
    { mine: false, width: 'w-48' },
    { mine: true, width: 'w-56' },
    { mine: false, width: 'w-36' },
    { mine: true, width: 'w-40' },
  ]
  return (
    <div aria-hidden="true" className="space-y-3">
      {rows.map((row, index) => (
        <div key={index} className={`flex ${row.mine ? 'justify-end' : 'justify-start'}`}>
          <span className={`h-10 ${row.width} max-w-[70%] animate-pulse rounded-2xl bg-surface-muted`} />
        </div>
      ))}
    </div>
  )
}
