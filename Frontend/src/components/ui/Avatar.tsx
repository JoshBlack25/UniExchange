/*
  A profile photo in a circle, or - when there is no photo, or it fails to
  load - initials on a gradient that is deterministic per name, so the same
  student is always the same colour across every page.

    <Avatar name={sellerName} src={photoSrc(seller)} className="size-10" />
    <Avatar name={me} ring />            white ring, for overlapping a cover
    <Avatar name={them} online />        green presence dot
*/

import { useState } from 'react'

import { safeUrl } from '@/lib/safeUrl'

type AvatarProps = {
  name?: string | null
  /** Absolute photo URL (see photoSrc). Falls back to initials if missing or broken. */
  src?: string | null
  className?: string
  /** A ring in the page colour - use when the avatar overlaps a banner. */
  ring?: boolean
  online?: boolean
}

const GRADIENTS = [
  'from-sky-400 to-brand-500',
  'from-teal-400 to-cyan-600',
  'from-indigo-400 to-violet-600',
  'from-rose-400 to-pink-600',
  'from-orange-400 to-rose-500',
  'from-lime-500 to-teal-600',
] as const

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function gradientOf(name: string | null | undefined): string {
  if (!name) return 'from-gray-400 to-gray-500'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

export function Avatar({ name, src, className = 'size-10', ring = false, online = false }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const photo = safeUrl(src)
  const showPhoto = !!photo && photo !== failedSrc

  return (
    <span aria-hidden="true" className={`${className} @container relative inline-grid shrink-0`}>
      {showPhoto ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(photo ?? null)}
          className={'size-full rounded-full object-cover shadow-sm ' + (ring ? 'ring-4 ring-canvas' : '')}
        />
      ) : (
        <span
          className={
            `grid size-full place-items-center rounded-full bg-gradient-to-br ${gradientOf(name)} ` +
            'font-semibold text-white shadow-sm select-none ' +
            (ring ? 'ring-4 ring-canvas' : '')
          }
          // Scales with the avatar: a size-24 profile avatar gets big initials.
          style={{ fontSize: 'clamp(0.625rem, 38cqw, 2.25rem)' }}
        >
          {initialsOf(name)}
        </span>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 size-[28%] min-h-2 min-w-2 rounded-full bg-emerald-500 ring-2 ring-surface" />
      )}
    </span>
  )
}
