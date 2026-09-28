/*
  The shell's icons: five tabs, bell, wallet and the extras the top bar and
  left sidebar need.

  Thin wrappers over Phosphor (@phosphor-icons/react) so call sites keep the
  old API - size with Tailwind's size-* utility, and pass `active` to switch
  to the filled weight for the current destination. Anywhere else in the app,
  import from @phosphor-icons/react directly and keep weight="regular" (or
  "fill" for an on/selected state) so there is one icon language.

  Author: Mogamat Yaseen Kannemeyer 240453182
*/

import {
  Bell,
  ChatCircleDots,
  Crown,
  House,
  MagnifyingGlass,
  Megaphone,
  Moon,
  PlusCircle,
  ShieldCheck,
  ShoppingBag,
  SignOut,
  Sun,
  UserCircle,
  Wallet,
  type Icon,
} from '@phosphor-icons/react'

export type NavIconProps = { className?: string; active?: boolean }

function wrap(PhosphorIcon: Icon) {
  return function NavIcon({ className = 'size-5', active = false }: NavIconProps) {
    return <PhosphorIcon aria-hidden="true" className={className} weight={active ? 'fill' : 'regular'} />
  }
}

export const FeedIcon = wrap(House)
export const BulletinIcon = wrap(Megaphone)
export const SellIcon = wrap(PlusCircle)
export const MessagesIcon = wrap(ChatCircleDots)
export const ProfileIcon = wrap(UserCircle)
export const BellIcon = wrap(Bell)
export const WalletIcon = wrap(Wallet)
export const PurchasesIcon = wrap(ShoppingBag)
export const SearchIcon = wrap(MagnifyingGlass)
export const SignOutIcon = wrap(SignOut)
export const MoonIcon = wrap(Moon)
export const SunIcon = wrap(Sun)
export const ModerationIcon = wrap(ShieldCheck)
export const AdminIcon = wrap(Crown)
