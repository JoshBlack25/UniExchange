/*
  The top of a profile, Facebook style: a teal cover band, a large avatar
  overlapping it, the student's name and contact line, badges, a stats row,
  and - at the bottom edge of the card - the Listings / Reviews tabs (passed
  in as `tabs`, so the page keeps owning which tab is open).

  Phone: everything centred under the avatar. sm+: avatar left, name beside
  it, action on the right.

  OWNER: Raul Ja'aim Everts (230270565)
*/

import { CalendarBlank, EnvelopeSimple, SealCheck, Star } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import { photoSrc } from '@/lib/api/profilePhotos'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import type { TrustedSellerBadge, User } from '@/lib/api/types'

type ProfileHeaderProps = {
  user: User
  roles: string[]
  badge: TrustedSellerBadge | null
  avgRating: number | null
  reviewCount: number
  activeListings: number
  soldListings: number
  /** True while listings/reviews are still loading - the stats show placeholders. */
  statsLoading: boolean
  /** The one primary action, e.g. "New listing" on your own profile. */
  action?: ReactNode
  tabs: ReactNode
}

const memberSince = new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' })

export function ProfileHeader({
  user,
  roles,
  badge,
  avgRating,
  reviewCount,
  activeListings,
  soldListings,
  statsLoading,
  action,
  tabs,
}: ProfileHeaderProps) {
  const fullName = `${user.firstName} ${user.lastName}`
  const isBadgeActive = badge !== null && badge.revokedAt === null

  const stats: Array<{ label: string; value: ReactNode }> = [
    { label: 'Active', value: activeListings },
    { label: 'Sold', value: soldListings },
    {
      label: 'Rating',
      value:
        avgRating !== null ? (
          <span className="inline-flex items-center gap-1">
            <Star aria-hidden="true" weight="fill" className="size-4 text-amber-500" />
            {avgRating.toFixed(1)}
          </span>
        ) : (
          '–'
        ),
    },
    { label: reviewCount === 1 ? 'Review' : 'Reviews', value: reviewCount },
  ]

  return (
    <Card padding="none" className="mb-4">
      {/* Cover band - decorative. Explicit hexes so it stays teal in both themes. */}
      <div
        aria-hidden="true"
        className="relative h-32 overflow-hidden rounded-t-2xl bg-linear-to-br from-[#0f3243] via-[#16658a] to-[#2bb3c0] sm:h-44"
      >
        <div className="absolute -right-16 -top-20 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 left-1/4 size-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.14)_1px,transparent_0)] bg-size-[18px_18px]" />
      </div>

      <div className="px-4 pb-4 sm:px-6">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:gap-5 sm:text-left">
          <div className="-mt-14 sm:-mt-12">
            <Avatar name={fullName} src={photoSrc(user)} ring className="size-28 sm:size-36" />
          </div>

          <div className="mt-3 min-w-0 flex-1 sm:mt-0 sm:pb-1">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
              <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{fullName}</h1>
              {isBadgeActive && (
                <SealCheck
                  weight="fill"
                  className="size-6 text-brand-600"
                  aria-label="Trusted seller"
                  role="img"
                />
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-fg-muted sm:justify-start">
              {/* Only your own profile (or a staff session) carries the email - other
                  students get the backend's public profile, which leaves it out. */}
              {user.email && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <EnvelopeSimple aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarBlank aria-hidden="true" className="size-4 shrink-0" />
                Joined {memberSince.format(new Date(user.createdAt))}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {isBadgeActive && (
                <Badge tone="success">
                  <SealCheck aria-hidden="true" weight="fill" className="size-3.5" />
                  Trusted Seller
                </Badge>
              )}
              {user.affiliation === 'STAFF' ? <Badge tone="brand">CPUT Staff</Badge> : <Badge>Student</Badge>}
              {user.accountStatus !== 'ACTIVE' && (
                <Badge tone="warning">
                  {user.accountStatus === 'SUSPENDED' ? 'Suspended' : user.accountStatus}
                </Badge>
              )}
              {roles.map((role) => (
                <Badge key={role} tone="brand">
                  {role.replace('ROLE_', '')}
                </Badge>
              ))}
            </div>
          </div>

          {action && <div className="mt-4 w-full sm:mt-0 sm:w-auto sm:pb-1">{action}</div>}
        </div>

        {/* stats row */}
        <dl className="mt-5 grid grid-cols-4 divide-x divide-line rounded-2xl border border-line bg-surface-muted/60">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5 px-1 py-3">
              <dt className="order-2 text-xs font-medium text-fg-muted">{stat.label}</dt>
              <dd className="order-1 text-lg font-bold tabular-nums text-fg">
                {statsLoading ? (
                  <span aria-label="Loading" className="block h-6 w-8 animate-pulse rounded bg-line" />
                ) : (
                  stat.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-t border-line px-2 sm:px-4">{tabs}</div>
    </Card>
  )
}
