/*
  Stars, for both reading and writing a rating.

  Interactive mode is a real radio group rather than clickable divs, so it works
  with a keyboard and announces itself to a screen reader. Display mode is a
  single labelled image, because eleven separate "star" announcements is noise.

  Each interactive star is a 44px target (thumb-sized on a phone), and the
  chosen score is echoed as a word beside the stars so it is not colour alone.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Star } from '@phosphor-icons/react'

const VALUES = [1, 2, 3, 4, 5] as const
const WORDS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'] as const

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  className?: string
}

export function StarRating({ value, onChange, className = '' }: StarRatingProps) {
  if (!onChange) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 ${className}`}
        role="img"
        aria-label={`${Number.isInteger(value) ? value : value.toFixed(1)} out of 5`}
      >
        {VALUES.map((star) => {
          const filled = star <= Math.round(value)
          return (
            <Star
              key={star}
              aria-hidden="true"
              weight="fill"
              className={`size-5 ${filled ? 'text-amber-500' : 'text-line-strong'}`}
            />
          )
        })}
      </span>
    )
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 ${className}`}>
      <span role="radiogroup" aria-label="Rating" className="-ml-1.5 inline-flex items-center">
        {VALUES.map((star) => {
          const filled = star <= value
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star === 1 ? '' : 's'}`}
              onClick={() => onChange(star)}
              className={
                'grid size-11 place-items-center rounded-full transition hover:bg-amber-50 active:scale-90 motion-safe:hover:scale-110 ' +
                'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500 ' +
                (filled ? 'text-amber-500' : 'text-line-strong hover:text-amber-500')
              }
            >
              <Star aria-hidden="true" weight={filled ? 'fill' : 'regular'} className="size-7" />
            </button>
          )
        })}
      </span>
      <span aria-hidden="true" className="text-sm font-semibold text-amber-700">
        {WORDS[value] ?? ''}
      </span>
    </span>
  )
}
