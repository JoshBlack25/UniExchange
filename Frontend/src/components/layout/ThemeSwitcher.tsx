/*
  Three-way System / Light / Dark control. A radio group, so arrow keys move
  between the options and a screen reader announces the current one.
*/

import { Desktop, Moon, Sun } from '@phosphor-icons/react'

import { useTheme, type ThemePreference } from '@/lib/theme'

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', Icon: Desktop },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1 ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const checked = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => setPreference(value)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
              event.preventDefault()
              const step = event.key === 'ArrowRight' ? 1 : -1
              const index = OPTIONS.findIndex((o) => o.value === preference)
              const next = OPTIONS[(index + step + OPTIONS.length) % OPTIONS.length]
              setPreference(next.value)
              event.currentTarget.parentElement
                ?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
                ?.focus()
            }}
            data-value={value}
            className={
              'flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition ' +
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 ' +
              (checked ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')
            }
          >
            <Icon aria-hidden="true" className="size-4" weight={checked ? 'fill' : 'regular'} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
