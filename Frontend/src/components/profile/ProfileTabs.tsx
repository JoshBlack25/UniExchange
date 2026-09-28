/*
  Accessible tab strip for a profile (Listings / Reviews): a real ARIA
  tablist - arrow keys, Home and End move between tabs, only the selected tab
  is in the Tab order, and each tab controls a panel with id `${idBase}-panel-${key}`.

  Sits along the bottom edge of ProfileHeader. scroller-x so more tabs can
  be added later without breaking a 390px screen.

  OWNER: Raul Ja'aim Everts (230270565)
*/

import { useRef } from 'react'

export type ProfileTab = { key: string; label: string; count?: number }

type ProfileTabsProps = {
  tabs: ProfileTab[]
  selected: string
  onSelect: (key: string) => void
  idBase: string
  label: string
}

export function ProfileTabs({ tabs, selected, onSelect, idBase, label }: ProfileTabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    let next = -1
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (next === -1) return
    event.preventDefault()
    onSelect(tabs[next].key)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className="scroller-x flex gap-1">
      {tabs.map((tab, index) => {
        const active = tab.key === selected
        return (
          <button
            key={tab.key}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab.key}`}
            aria-selected={active}
            aria-controls={`${idBase}-panel-${tab.key}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(tab.key)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={
              'relative inline-flex min-h-12 shrink-0 snap-start items-center gap-2 whitespace-nowrap px-4 text-sm font-semibold transition ' +
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 ' +
              (active ? 'text-brand-700' : 'rounded-xl text-fg-muted hover:bg-surface-muted hover:text-fg')
            }
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={
                  'rounded-full px-1.5 py-0.5 text-xs tabular-nums ' +
                  (active ? 'bg-brand-50 text-brand-800' : 'bg-surface-muted text-fg-muted')
                }
              >
                {tab.count}
              </span>
            )}
            {active && (
              <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
