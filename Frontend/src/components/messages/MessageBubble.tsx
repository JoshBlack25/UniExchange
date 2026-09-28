/*
  One message in a thread: your own on the right, theirs on the left.

  Messenger-style grouping: ChatPage tells each bubble whether it starts
  (`first`) and/or ends (`last`) a run of messages from the same sender. The
  corners facing the other bubbles in the run are tightened, the other
  student's avatar sits beside the last bubble only, and the time is printed
  once under the run rather than inside every bubble (each bubble still
  carries it for screen readers and as a hover title).

  Attachment URLs come from the backend already signed and bound to you as the
  viewer, so they go straight into src with no Authorization header - a media
  element cannot send one. Do not prefix BASE_URL onto them.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { DownloadSimple } from '@phosphor-icons/react'
import { useState } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import type { ChatMessageView } from '@/lib/api/types'

import { VoiceNotePlayer } from './VoiceNotePlayer'
import { safeUrl } from '@/lib/safeUrl'

type MessageBubbleProps = {
  message: ChatMessageView
  mine: boolean
  /** The other student's name, for the avatar beside their messages. */
  senderName?: string
  /** First bubble in a run from the same sender. */
  first?: boolean
  /** Last bubble in a run - gets the avatar and the timestamp. */
  last?: boolean
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message, mine, senderName, first = true, last = true }: MessageBubbleProps) {
  const hasText = message.content.trim().length > 0
  const mediaOnly = !!message.media && !hasText
  const time = formatTime(message.sentAt)

  // Corners toward the rest of the run tighten, so a run reads as one block.
  const corners = mine
    ? `${first ? '' : 'rounded-tr-md'} ${last ? '' : 'rounded-br-md'}`
    : `${first ? '' : 'rounded-tl-md'} ${last ? '' : 'rounded-bl-md'}`

  const tone = mine
    ? 'bg-linear-to-br from-brand-500 to-primary text-on-primary shadow-sm shadow-primary/20'
    : 'bg-surface-muted text-fg ring-1 ring-inset ring-line'

  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div className={`flex w-full items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
        {!mine &&
          (last ? (
            <Avatar name={senderName} className="size-7" />
          ) : (
            <span aria-hidden="true" className="size-7 shrink-0" />
          ))}

        <div
          title={time}
          className={`min-w-0 max-w-[min(32rem,78%)] rounded-2xl ${corners} ${tone} ${mediaOnly ? 'p-1' : 'px-3.5 py-2'}`}
        >
          {message.media && <Attachment message={message} mine={mine} />}

          {hasText && (
            <p
              className={`whitespace-pre-wrap text-[0.9375rem] leading-snug wrap-break-word ${
                message.media ? 'mt-2 px-2.5 pb-1' : ''
              }`}
            >
              {message.content}
            </p>
          )}

          {!last && <span className="sr-only">, sent {time}</span>}
        </div>
      </div>

      {last && (
        <span className={`mt-1 text-[11px] tabular-nums text-fg-muted ${mine ? 'pr-1' : 'pl-10'}`}>
          <span className="sr-only">{mine ? 'You, ' : `${senderName ?? 'They'}, `}</span>
          {time}
        </span>
      )}
    </div>
  )
}

function Attachment({ message, mine }: { message: ChatMessageView; mine: boolean }) {
  const media = message.media
  const [failed, setFailed] = useState(false)

  if (!media) return null

  if (failed) {
    return (
      <a
        href={safeUrl(media.url)}
        download
        className={`flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500 ${
          mine ? 'text-on-primary' : 'text-brand-700'
        }`}
      >
        <DownloadSimple aria-hidden="true" className="size-5" />
        Download attachment
      </a>
    )
  }

  if (media.mediaType === 'AUDIO') {
    return (
      <div className="px-1.5 py-1">
        <VoiceNotePlayer media={media} mine={mine} />
      </div>
    )
  }

  if (media.mediaType === 'VIDEO') {
    return (
      // controls, and preload="metadata" so opening a thread does not pull down
      // every video in it. Seeking works because the backend answers Range
      // requests for this URL.
      <video
        src={safeUrl(media.url)}
        controls
        preload="metadata"
        onError={() => setFailed(true)}
        className="max-h-80 w-full rounded-xl bg-black"
      />
    )
  }

  return (
    <a
      href={safeUrl(media.url)}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <img
        src={safeUrl(media.url)}
        alt={media.originalFilename ?? 'Shared image'}
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-80 rounded-xl object-cover"
      />
    </a>
  )
}
