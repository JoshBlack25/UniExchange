/*
  The five destinations in the app shell, in one place so the mobile tab bar and
  the desktop nav can never drift apart.

  Kept out of the component files so Vite's fast refresh keeps working - a module
  that mixes components with other exports loses HMR.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import type { ComponentType } from 'react'

import type { SessionMode } from '@/lib/api/types'

import {
  AdminIcon,
  BellIcon,
  BulletinIcon,
  FeedIcon,
  MessagesIcon,
  ModerationIcon,
  ProfileIcon,
  PurchasesIcon,
  SellIcon,
  WalletIcon,
  type NavIconProps,
} from './NavIcons'

export type NavItem = {
  to: string
  label: string
  Icon: ComponentType<NavIconProps>
  /** Highlight the tab for nested paths too, e.g. /messages/7 lights up Messages. */
  match: (pathname: string) => boolean
  /** Only shown in a session opened in this mode (an ADMIN session also counts as MODERATOR). */
  mode?: 'MODERATOR' | 'ADMIN'
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/feed',
    label: 'Feed',
    Icon: FeedIcon,
    match: (p) => p === '/feed' || (p.startsWith('/listings') && p !== '/listings/new'),
  },
  {
    to: '/bulletin',
    label: 'Bulletin',
    Icon: BulletinIcon,
    match: (p) => p.startsWith('/bulletin'),
  },
  {
    to: '/listings/new',
    label: 'Sell',
    Icon: SellIcon,
    match: (p) => p === '/listings/new',
  },
  {
    to: '/messages',
    label: 'Messages',
    Icon: MessagesIcon,
    match: (p) => p.startsWith('/messages'),
  },
  {
    to: '/profile',
    label: 'Profile',
    Icon: ProfileIcon,
    match: (p) => p.startsWith('/profile'),
  },
]

/*
  Secondary destinations - the left sidebar's "Your shortcuts" and the avatar
  menu. Not in NAV_ITEMS because the mobile tab bar is capped at five.
*/
export const SHORTCUT_ITEMS: NavItem[] = [
  {
    to: '/wallet',
    label: 'Wallet',
    Icon: WalletIcon,
    match: (p) => p.startsWith('/wallet'),
  },
  {
    to: '/purchases',
    label: 'Purchases',
    Icon: PurchasesIcon,
    match: (p) => p.startsWith('/purchases'),
  },
  {
    to: '/notifications',
    label: 'Notifications',
    Icon: BellIcon,
    match: (p) => p.startsWith('/notifications'),
  },
]

/*
  Moderation destinations. Invisible unless the session was opened through the
  hidden moderator/admin sign-in - a moderator browsing normally sees the same
  app as everyone else.
*/
export const STAFF_ITEMS: NavItem[] = [
  {
    to: '/moderation',
    label: 'Moderation',
    Icon: ModerationIcon,
    match: (p) => p.startsWith('/moderation'),
    mode: 'MODERATOR',
  },
  {
    to: '/admin/staff',
    label: 'Manage staff',
    Icon: AdminIcon,
    match: (p) => p.startsWith('/admin'),
    mode: 'ADMIN',
  },
]

export function staffItemsFor(mode: SessionMode): NavItem[] {
  return STAFF_ITEMS.filter((item) =>
    item.mode === 'ADMIN' ? mode === 'ADMIN' : mode === 'MODERATOR' || mode === 'ADMIN',
  )
}
