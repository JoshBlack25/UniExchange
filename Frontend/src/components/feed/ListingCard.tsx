/*
  ListingCard - one item in the feed grid (T2 mockup: "2 Marketplace Feed").

  Image area is a placeholder for v1; per-listing images cost one request per
  card, which we add in v1.5. The whole card is a link to the product page.

  Owner: Joshua Reid Adams (230317693)
*/

import { Card } from '@/components/ui/Card'
import type { Listing } from '@/lib/api/types'

type ListingCardProps = {
  listing: Listing
  /** Resolved campus name for the location line; falls back to a generic label. */
  campusName?: string
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function ListingCard({ listing, campusName }: ListingCardProps) {
  return (
    <Card to={`/listings/${listing.listingId}`} className="flex h-full flex-col gap-2 p-3">
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-gray-100 text-gray-400">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-10"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m5 18 4.5-5 3 3.5L15 13l4 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold text-ink-900">{listing.title}</h3>
      <p className="text-base font-bold text-brand-700">{zar.format(listing.price)}</p>

      <p className="mt-auto flex items-center gap-1 text-xs text-ink-500">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-3.5 shrink-0"
        >
          <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <span className="truncate">
          {campusName ?? 'On campus'} <span aria-hidden="true">•</span> {timeAgo(listing.createdAt)}
        </span>
      </p>
    </Card>
  )
}
