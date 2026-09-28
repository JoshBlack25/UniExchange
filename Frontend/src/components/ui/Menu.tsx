/*
  Dropdown menu - the avatar menu in the top bar, card overflow menus.

    <Menu label="Account menu" trigger={<Avatar name={me} />}>
      <MenuItem to="/profile" icon={<User />}>Profile</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={signOut} tone="danger">Sign out</MenuItem>
    </Menu>

  Keyboard: Enter/Space/ArrowDown on the trigger opens and focuses the first
  item; arrows, Home and End move; Esc closes and returns focus to the
  trigger; Tab or a click outside closes.
*/

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

const CloseContext = createContext<() => void>(() => {})

type MenuProps = {
  /** Accessible name for the trigger button. */
  label: string
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  triggerClassName?: string
}

export function Menu({ label, trigger, children, align = 'end', triggerClassName = '' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)

  const items = () => Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

  const close = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) button.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    items()[0]?.focus()

    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function onListKeyDown(event: React.KeyboardEvent) {
    const nodes = items()
    const index = nodes.indexOf(document.activeElement as HTMLElement)
    const focusAt = (i: number) => nodes[(i + nodes.length) % nodes.length]?.focus()

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusAt(index + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusAt(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(nodes.length - 1)
        break
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Tab':
        close(false)
        break
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={
          'rounded-full transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
          `focus-visible:outline-brand-500 ${triggerClassName}`
        }
      >
        {trigger}
      </button>

      {open && (
        <CloseContext.Provider value={() => close(false)}>
          <div
            ref={list}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onListKeyDown}
            className={
              // Near-opaque rather than glass: a menu usually opens inside something
              // that already has a backdrop-filter (the top bar, a glass-card),
              // and nested backdrop blur does not render, so glass would show
              // the text behind straight through.
              'absolute top-full z-40 mt-2 w-64 origin-top animate-pop-in rounded-2xl border border-line bg-surface/97 p-1.5 shadow-float ' +
              (align === 'end' ? 'right-0' : 'left-0')
            }
          >
            {children}
          </div>
        </CloseContext.Provider>
      )}
    </div>
  )
}

type MenuItemProps = {
  children: ReactNode
  icon?: ReactNode
  /** Router link destination. */
  to?: string
  onSelect?: () => void
  tone?: 'default' | 'danger'
  /** Right-hand hint, e.g. the current theme. */
  meta?: ReactNode
}

export function MenuItem({ children, icon, to, onSelect, tone = 'default', meta }: MenuItemProps) {
  const close = useContext(CloseContext)
  const className =
    'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium outline-none transition ' +
    'focus-visible:bg-surface-muted hover:bg-surface-muted ' +
    (tone === 'danger' ? 'text-red-700' : 'text-fg')

  const content = (
    <>
      {icon && (
        <span
          aria-hidden="true"
          className={
            'grid size-8 shrink-0 place-items-center rounded-full [&>svg]:size-[18px] ' +
            (tone === 'danger' ? 'bg-red-50 text-red-700' : 'bg-surface-muted text-fg')
          }
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {meta && <span className="shrink-0 text-xs text-fg-subtle">{meta}</span>}
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        role="menuitem"
        tabIndex={-1}
        className={className}
        onClick={() => {
          onSelect?.()
          close()
        }}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={className}
      onClick={() => {
        onSelect?.()
        close()
      }}
    >
      {content}
    </button>
  )
}

export function MenuSeparator() {
  return <div role="separator" className="my-1.5 h-px bg-line" />
}

/* A non-interactive heading row inside a menu, e.g. the signed-in user. */
export function MenuHeader({ children }: { children: ReactNode }) {
  return <div className="px-3 py-2">{children}</div>
}
