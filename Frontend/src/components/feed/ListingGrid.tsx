/*
  ListingGrid - responsive card grid for the feed.
  1 column (mobile) -> 2 (sm) -> 3 (xl), matching the T2 mobile + desktop mockups.

  Owner: Joshua Reid Adams (230317693)
*/

import { ListingCard } from './ListingCard'
import type { Listing } from '@/lib/api/types'

type ListingGridProps = {
  listings: Listing[]
  /** campusId -> campus name, resolved once in FeedPage. */
  campusNames: Record<number, string>
}

export function ListingGrid({ listings, campusNames }: ListingGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard
          key={listing.listingId}
          listing={listing}
          campusName={campusNames[listing.campusId]}
        />
      ))}
    </div>
  )
}
