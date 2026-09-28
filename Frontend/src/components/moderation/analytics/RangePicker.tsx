/*
  Time-range control for the dashboard. A radio group like ThemeSwitcher, so
  arrow keys move the selection and a screen reader announces it. Ten options
  do not fit a phone, so the row scrolls sideways there.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import type { AnalyticsRange } from '@/lib/api/types'

import { RANGES } from './ranges'

type RangePickerProps = {
  value: AnalyticsRange
  onChange: (range: AnalyticsRange) => void
}

export function RangePicker({ value, onChange }: RangePickerProps) {
  return (
    <div className="scroller-x -mx-1 px-1">
      <div
        role="radiogroup"
        aria-label="Time range"
        className="inline-flex gap-1 rounded-xl bg-surface-muted p-1"
      >
        {RANGES.map((range) => {
          const checked = range.value === value
          return (
            <button
              key={range.value}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={range.long}
              title={range.long}
              tabIndex={checked ? 0 : -1}
              data-value={range.value}
              onClick={() => onChange(range.value)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                event.preventDefault()
                const step = event.key === 'ArrowRight' ? 1 : -1
                const index = RANGES.findIndex((r) => r.value === value)
                const next = RANGES[(index + step + RANGES.length) % RANGES.length]
                onChange(next.value)
                const group = event.currentTarget.parentElement
                ;(group?.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus()
              }}
              className={
                'min-h-9 min-w-11 shrink-0 cursor-pointer rounded-lg px-2.5 text-xs font-semibold tabular-nums transition ' +
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 ' +
                (checked ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')
              }
            >
              {range.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
