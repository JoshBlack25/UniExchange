/*
  The chat composer: text, a photo/video attachment, or a voice note.

  Attachments upload BEFORE the message is sent, which is why there is a staged
  preview state here. That two-step is what makes progress, cancel and retry
  possible - and means a failed 25MB upload never loses the caption the student
  typed while waiting.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import {
  CircleNotch,
  ImageSquare,
  Microphone,
  PaperPlaneRight,
  Stop,
  Trash,
  X,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'

import { chatApi } from '@/lib/api/chat'
import { ApiError } from '@/lib/api/client'
import type { ChatMediaUploaded } from '@/lib/api/types'
import { Alert } from '@/components/ui/Alert'
import { IconButton } from '@/components/ui/IconButton'

import { supportsVoiceNotes, useVoiceRecorder } from './useVoiceRecorder'

/** Matches ChatMediaStorage's whitelist on the backend. */
const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm'

const MAX_BYTES = 25 * 1024 * 1024

type StagedMedia = {
  uploaded: ChatMediaUploaded
  previewUrl: string
  kind: 'image' | 'video' | 'audio'
}

type MessageComposerProps = {
  conversationId: number
  onSent: () => void
}

export function MessageComposer({ conversationId, onSent }: MessageComposerProps) {
  const [text, setText] = useState('')
  const [staged, setStaged] = useState<StagedMedia | null>(null)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const recorder = useVoiceRecorder()

  // Object URLs are a leak if they are not released.
  useEffect(() => {
    return () => {
      if (staged) URL.revokeObjectURL(staged.previewUrl)
    }
  }, [staged])

  async function upload(file: File, kind: StagedMedia['kind'], durationMs?: number) {
    if (file.size > MAX_BYTES) {
      setError('That file is larger than 25 MB.')
      return
    }

    setError(null)
    setUploadPercent(0)
    try {
      const uploaded = await chatApi.uploadMedia(conversationId, file, {
        durationMs,
        onProgress: setUploadPercent,
      })
      setStaged({ uploaded, previewUrl: URL.createObjectURL(file), kind })
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'That file could not be uploaded.')
    } finally {
      setUploadPercent(null)
    }
  }

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so picking the same file twice in a row still fires a change event.
    event.target.value = ''
    if (!file) return
    void upload(file, file.type.startsWith('video/') ? 'video' : 'image')
  }

  async function finishRecording() {
    const note = await recorder.stop()
    if (!note) return
    URL.revokeObjectURL(note.previewUrl)
    void upload(note.file, 'audio', note.durationMs)
  }

  function discardStaged() {
    if (staged) URL.revokeObjectURL(staged.previewUrl)
    setStaged(null)
  }

  async function send(event: React.FormEvent) {
    event.preventDefault()
    const content = text.trim()
    if (!content && !staged) return

    setSending(true)
    setError(null)
    try {
      await chatApi.send(conversationId, { content, mediaId: staged?.uploaded.mediaId ?? null })
      setText('')
      discardStaged()
      onSent()
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Your message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  const uploading = uploadPercent !== null
  const canSend = !uploading && (!!text.trim() || !!staged)
  const recordedSeconds = Math.floor(recorder.elapsedMs / 1000)
  const recordedClock = `${Math.floor(recordedSeconds / 60)}:${String(recordedSeconds % 60).padStart(2, '0')}`

  // 44px round targets - thumb sized, and the same shape for every action.
  const roundButton =
    'grid size-11 shrink-0 place-items-center rounded-full transition active:scale-95 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
  const iconButton = `${roundButton} text-brand-700 hover:bg-brand-50`

  return (
    <form onSubmit={send} className="border-t border-line px-2 py-2 sm:px-3">
      {(error || recorder.error) && (
        <div className="mb-2 space-y-2">
          {error && <Alert tone="error">{error}</Alert>}
          {recorder.error && <Alert tone="error">{recorder.error}</Alert>}
        </div>
      )}

      {uploading && (
        <div className="mb-2 px-1" role="status" aria-live="polite">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
          <span className="mt-1 block text-xs tabular-nums text-fg-muted">Uploading… {uploadPercent}%</span>
        </div>
      )}

      {staged && (
        <div className="mb-2 flex items-center gap-3 rounded-2xl border border-line bg-surface-muted p-2">
          {staged.kind === 'image' && (
            <img src={staged.previewUrl} alt="" className="size-14 rounded-xl object-cover" />
          )}
          {staged.kind === 'video' && (
            <video src={staged.previewUrl} className="size-14 rounded-xl bg-black object-cover" />
          )}
          {staged.kind === 'audio' && (
            <span className="grid size-14 place-items-center rounded-xl bg-brand-100 text-brand-800">
              <Microphone aria-hidden="true" weight="fill" className="size-6" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-fg">
              {staged.kind === 'image' ? 'Photo' : staged.kind === 'video' ? 'Video' : 'Voice note'} attached
            </span>
            <span className="block text-xs text-fg-muted">Add a caption or tap send</span>
          </span>
          <IconButton label="Remove attachment" tone="plain" onClick={discardStaged}>
            <X aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
      )}

      {recorder.recording ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={recorder.cancel}
            aria-label="Discard recording"
            title="Discard recording"
            className={`${roundButton} text-red-700 hover:bg-red-50`}
          >
            <Trash aria-hidden="true" className="size-5" />
          </button>

          <div
            role="status"
            aria-live="polite"
            className="flex min-h-11 flex-1 items-center gap-2.5 rounded-full bg-red-50 px-4 text-sm font-medium text-red-700"
          >
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full rounded-full bg-red-500 opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
            </span>
            Recording
            <span className="ml-auto tabular-nums">{recordedClock}</span>
          </div>

          <button
            type="button"
            onClick={finishRecording}
            aria-label="Finish recording"
            title="Finish recording"
            className={`${roundButton} bg-primary text-on-primary shadow-sm shadow-primary/25 hover:bg-primary-hover`}
          >
            <Stop aria-hidden="true" weight="fill" className="size-5" />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={onPickFile}
            className="peer sr-only"
            id="chat-attachment"
            disabled={uploading}
          />
          <label
            htmlFor="chat-attachment"
            title="Attach a photo or video"
            className={`${iconButton} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500 peer-disabled:pointer-events-none peer-disabled:opacity-50`}
          >
            <ImageSquare aria-hidden="true" className="size-6" />
            <span className="sr-only">Attach a photo or video</span>
          </label>

          {supportsVoiceNotes() && (
            <button
              type="button"
              onClick={recorder.start}
              title="Record a voice note"
              disabled={uploading}
              className={`${iconButton} disabled:pointer-events-none disabled:opacity-50`}
            >
              <Microphone aria-hidden="true" className="size-6" />
              <span className="sr-only">Record a voice note</span>
            </button>
          )}

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter makes a new line - what everyone expects
              // from a chat box.
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send(event)
              }
            }}
            rows={1}
            placeholder="Aa"
            aria-label="Message"
            // field-sizing grows the box with its text (Chromium); elsewhere it
            // stays one line and scrolls, capped either way at max-h-32.
            className={
              'ml-1 block max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-3xl border border-transparent bg-surface-muted px-4 py-2.5 ' +
              'text-[0.9375rem] leading-6 text-fg [field-sizing:content] placeholder:text-fg-subtle transition ' +
              'hover:border-line focus:border-brand-500 focus:outline-2 focus:outline-brand-500/30'
            }
          />

          <button
            type="submit"
            disabled={!canSend || sending}
            aria-busy={sending || undefined}
            className={
              `${roundButton} bg-primary text-on-primary shadow-sm shadow-primary/25 hover:bg-primary-hover ` +
              'disabled:pointer-events-none disabled:bg-surface-muted disabled:text-fg-subtle disabled:shadow-none'
            }
          >
            {sending ? (
              <CircleNotch aria-hidden="true" className="size-5 motion-safe:animate-spin" />
            ) : (
              <PaperPlaneRight aria-hidden="true" weight="fill" className="size-5" />
            )}
            <span className="sr-only">Send</span>
          </button>
        </div>
      )}
    </form>
  )
}
