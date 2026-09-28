/*
  Six single-character boxes that behave like one field.

  Deliberate details: pasting the whole code fills every box, Backspace on an
  empty box steps back, arrow keys move between boxes, and the inputs use
  inputMode="numeric" so phones show the number pad. type="text" rather than
  type="number" because number inputs allow "e"/"+"/"-" and add steppers.
*/

import { useMemo, useRef } from 'react'

type OtpInputProps = {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  invalid?: boolean
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
}: OtpInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const cells = useMemo(
    () => Array.from({ length }, (_, i) => value[i] ?? ''),
    [length, value],
  )

  const commit = (next: string) => {
    const digits = next.replace(/\D/g, '').slice(0, length)
    onChange(digits)
    if (digits.length === length) {
      onComplete?.(digits)
    }
    return digits
  }

  const focus = (index: number) => {
    inputs.current[Math.max(0, Math.min(length - 1, index))]?.focus()
  }

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return

    // A paste lands in one box but should fill the rest.
    if (digits.length > 1) {
      const merged = commit(value.slice(0, index) + digits)
      focus(merged.length)
      return
    }

    const chars = cells.slice()
    chars[index] = digits
    commit(chars.join(''))
    focus(index + 1)
  }

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const chars = cells.slice()
      if (chars[index]) {
        chars[index] = ''
        commit(chars.join(''))
      } else if (index > 0) {
        chars[index - 1] = ''
        commit(chars.join(''))
        focus(index - 1)
      }
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focus(index - 1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focus(index + 1)
    }
  }

  return (
    <div className="flex justify-between gap-1.5 sm:gap-2" role="group" aria-label="Verification code">
      {cells.map((char, index) => (
        <input
          key={index}
          ref={(node) => {
            inputs.current[index] = node
          }}
          className={
            'otp-cell h-13 min-w-0 flex-1 rounded-xl border bg-surface text-center text-xl font-semibold shadow-xs ' +
            'text-fg tabular-nums transition focus:border-brand-500 focus:outline-2 focus:outline-offset-0 ' +
            'disabled:bg-surface-muted disabled:text-fg-subtle ' +
            (invalid
              ? 'border-red-300 focus:outline-red-500/40'
              : 'border-line-strong focus:outline-brand-500/30')
          }
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={char}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  )
}
