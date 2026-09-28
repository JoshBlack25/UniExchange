/*
  A voice note with its own transport controls.

  The native <audio controls> is deliberately NOT used. MediaRecorder writes a
  streaming container with no duration in it, so the browser reports
  `Infinity` and the built-in seek bar is dead - you can play, but not scrub or
  see how long the clip is. Since the recorder measured the real duration and
  stored it, we draw the bar ourselves from `durationMs` and drive currentTime
  directly, which restores scrubbing on every browser.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { DownloadSimple, Pause, Play } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'

import type { ChatMediaView } from '@/lib/api/types'
import { safeUrl } from '@/lib/safeUrl'

type VoiceNotePlayerProps = {
  media: ChatMediaView
  mine: boolean
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function VoiceNotePlayer({ media, mine }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [positionMs, setPositionMs] = useState(0)
  const [unplayable, setUnplayable] = useState(false)

  const durationMs = media.durationMs ?? 0
  const progress = durationMs > 0 ? Math.min(100, (positionMs / durationMs) * 100) : 0

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => setPositionMs(audio.currentTime * 1000)
    const onEnded = () => {
      setPlaying(false)
      setPositionMs(0)
    }
    // A note recorded in Chrome (WebM/Opus) may not play in Safari. Rather than
    // failing silently, fall back to a download link.
    const onError = () => setUnplayable(true)

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => setUnplayable(true))
    }
  }

  function seek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio || durationMs <= 0) return
    const nextMs = (Number(event.target.value) / 100) * durationMs
    audio.currentTime = nextMs / 1000
    setPositionMs(nextMs)
  }

  if (unplayable) {
    return (
      <a
        href={safeUrl(media.url)}
        download
        className={`flex min-h-11 items-center gap-2 rounded-xl text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500 ${
          mine ? 'text-on-primary' : 'text-brand-700'
        }`}
      >
        <DownloadSimple aria-hidden="true" className="size-5" />
        Download voice note ({formatClock(durationMs)})
      </a>
    )
  }

  return (
    <div className="flex w-56 max-w-full items-center gap-3 sm:w-64">
      {/* preload="metadata" keeps the thread cheap to open - the bytes only
          arrive when someone actually presses play. */}
      <audio ref={audioRef} src={safeUrl(media.url)} preload="metadata" />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className={`grid size-11 shrink-0 place-items-center rounded-full transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
          mine
            ? 'bg-on-primary text-primary hover:bg-on-primary/90'
            : 'bg-primary text-on-primary hover:bg-primary-hover'
        }`}
      >
        {playing ? (
          <Pause aria-hidden="true" weight="fill" className="size-5" />
        ) : (
          <Play aria-hidden="true" weight="fill" className="ml-0.5 size-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        {/* Our own track and fill, with the real range input laid invisibly
            on top - it still takes the pointer, the keyboard and the screen
            reader, so scrubbing works everywhere and looks the same in every
            browser and theme. */}
        <div className="relative flex h-6 items-center">
          <div
            aria-hidden="true"
            className={`h-1.5 w-full overflow-hidden rounded-full ${mine ? 'bg-on-primary/30' : 'bg-line-strong'}`}
          >
            <div
              className={`h-full rounded-full ${mine ? 'bg-on-primary' : 'bg-primary'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow ${
              mine ? 'bg-on-primary' : 'bg-primary'
            } ${playing || positionMs > 0 ? 'opacity-100' : 'opacity-0'} transition-opacity`}
            style={{ left: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={seek}
            aria-label="Seek within voice note"
            aria-valuetext={`${formatClock(positionMs)} of ${formatClock(durationMs)}`}
            className="peer absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-1 inset-y-0 rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500"
          />
        </div>
        <span className={`block text-xs font-medium tabular-nums ${mine ? 'text-on-primary/85' : 'text-fg-muted'}`}>
          {formatClock(playing || positionMs > 0 ? positionMs : durationMs)}
        </span>
      </div>
    </div>
  )
}
