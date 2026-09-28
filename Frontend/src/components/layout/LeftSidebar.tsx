/*
  Facebook-style left rail, lg and up: you, the five destinations, your
  shortcuts, and the theme switch. Below lg the same destinations live in the
  top bar tabs (md) or BottomNav (phone), and the shortcuts in the avatar menu.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import { Link, useLocation } from 'react-router-dom'

import { useSessionMode } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { photoSrc } from '@/lib/api/profilePhotos'

import { NAV_ITEMS, SHORTCUT_ITEMS, staffItemsFor, type NavItem } from './navigation'

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { to, label, Icon, match } = item
  const active = match(pathname)

  return (
    <li>
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        className={
          'group flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 text-[15px] font-medium transition ' +
          'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500 ' +
          (active ? 'bg-brand-50 text-brand-800' : 'text-fg hover:bg-surface-muted/80')
        }
      >
        <span
          aria-hidden="true"
          className={
            'grid size-9 shrink-0 place-items-center rounded-full transition ' +
            (active
              ? 'bg-primary text-on-primary shadow-sm shadow-primary/30'
              : 'bg-surface-muted text-fg-muted group-hover:text-fg')
          }
        >
          <Icon className="size-5" active={active} />
        </span>
        {label}
      </Link>
    </li>
  )
}

export function LeftSidebar() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const fullName = user ? `${user.firstName} ${user.lastName}` : null
  const onOwnProfile = pathname === '/profile'
  const staffItems = staffItemsFor(useSessionMode())

  return (
    <aside
      aria-label="Sidebar"
      className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col overflow-y-auto py-4 [scrollbar-width:thin] lg:flex xl:w-72"
    >
      <Link
        to="/profile"
        aria-current={onOwnProfile ? 'page' : undefined}
        className={
          'flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-muted/80 ' +
          'focus-visible:outline-2 focus-visible:outline-brand-500 ' +
          (onOwnProfile ? 'bg-brand-50' : '')
        }
      >
        <Avatar name={fullName} src={photoSrc(user)} className="size-9" />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-fg">{fullName ?? 'Your profile'}</span>
          <span className="block truncate text-xs text-fg-subtle">View your profile</span>
        </span>
      </Link>

      <nav aria-label="Sidebar navigation" className="mt-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} pathname={pathname} />
          ))}
        </ul>

        <div className="mx-2 my-3 h-px bg-line" />

        <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Your shortcuts
        </h2>
        <ul className="space-y-0.5">
          {SHORTCUT_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} pathname={pathname} />
          ))}
        </ul>

        {staffItems.length > 0 && (
          <>
            <div className="mx-2 my-3 h-px bg-line" />
            <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              Moderation
            </h2>
            <ul className="space-y-0.5">
              {staffItems.map((item) => (
                <SidebarLink key={item.to} item={item} pathname={pathname} />
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="mt-auto px-2 pt-6">
        <p className="text-xs leading-relaxed text-fg-subtle">
          UniExchange · A verified marketplace for CPUT students.
        </p>
      </div>
    </aside>
  )
}
