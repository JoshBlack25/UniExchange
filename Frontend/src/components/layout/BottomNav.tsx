/*
  Mobile tab bar. Hidden from md up, where TopBar shows the same destinations
  as centre tabs (and LeftSidebar from lg).

  Frosted glass, clear of the home indicator (safe-area inset), every target
  at least 48px tall, and "Sell" raised as the primary action. It slides out
  of the way while you scroll down a long feed and comes back on the first
  scroll up - transform only, so nothing underneath reflows.

  AppLayout pads <main> so content is never hidden behind this.
*/

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { NAV_ITEMS } from './navigation'

const HIDE_AFTER_PX = 120

export function BottomNav() {
  const { pathname } = useLocation()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0

    function onScroll() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - lastY
        if (Math.abs(delta) > 6) {
          setHidden(delta > 0 && y > HIDE_AFTER_PX)
          lastY = y
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // A new page always starts with the bar visible.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setHidden(false)
  }

  // Lets bars pinned above the tab bar follow it (see --ux-bottom-nav).
  useEffect(() => {
    document.documentElement.toggleAttribute('data-nav-hidden', hidden)
  }, [hidden])

  useEffect(() => () => document.documentElement.removeAttribute('data-nav-hidden'), [])

  return (
    <nav
      aria-label="Primary"
      className={
        'glass pb-safe fixed inset-x-0 bottom-0 z-30 border-t transition-transform duration-300 ease-out md:hidden ' +
        (hidden ? 'translate-y-full' : 'translate-y-0')
      }
    >
      <ul className="mx-auto flex max-w-lg items-stretch px-1">
        {NAV_ITEMS.map(({ to, label, Icon, match }) => {
          const active = match(pathname)
          const primary = to === '/listings/new'

          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={
                  'group flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ' +
                  'focus-visible:outline-none ' +
                  (active ? 'text-brand-600' : 'text-fg-subtle active:text-fg')
                }
              >
                {primary ? (
                  <span
                    className={
                      'grid h-8 w-12 place-items-center rounded-xl bg-primary text-on-primary shadow-md shadow-primary/30 ' +
                      'transition group-active:scale-95 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-brand-500'
                    }
                  >
                    <Icon className="size-5" active />
                  </span>
                ) : (
                  <span
                    className={
                      'grid h-8 w-14 place-items-center rounded-full transition group-active:scale-95 ' +
                      'group-focus-visible:outline-2 group-focus-visible:outline-brand-500 ' +
                      (active ? 'bg-brand-100' : '')
                    }
                  >
                    <Icon className="size-6" active={active} />
                  </span>
                )}
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
