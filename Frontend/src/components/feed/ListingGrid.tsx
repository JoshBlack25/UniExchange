/*
  ListingGrid - responsive card grid for the feed with a staggered entrance.
  1 column (mobile) -> 2 (sm) -> 3 (xl), matching the T2 mobile + desktop mockups.

  Cards fade in and rise 8px, one after another (40ms stagger), on mount.
  Motion-Primitives pattern implemented directly on the `motion` library.
  Users with `prefers-reduced-motion: reduce` get the cards instantly, no
  movement - handled by motion's useReducedMotion.

  Owner: Joshua Reid Adams (230317693)
*/

import { motion, useReducedMotion } from 'motion/react'

import { ListingCard } from './ListingCard'
import type { Listing } from '@/lib/api/types'

type ListingGridProps = {
  listings: Listing[]
  /** campusId -> campus name, resolved once in FeedPage. */
  campusNames: Record<number, string>
}

const STAGGER_MS = 0.04 // seconds between each card's entrance

export function ListingGrid({ listings, campusNames }: ListingGridProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing, index) => (
        <motion.div
          key={listing.listingId}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * STAGGER_MS, ease: 'easeOut' }}
        >
          <ListingCard listing={listing} campusName={campusNames[listing.campusId]} />
        </motion.div>
      ))}
    </div>
  )
}
