/*
  "More like this" - other ACTIVE listings in the same category on the same
  campus, with their primary photo.

  Two layouts: `row` (default) is a swipeable card strip for the main column
  on phones/tablets; `list` is a compact vertical list for the xl right rail.
  Loads with skeletons in the same shape, and renders nothing when there are
  no matches.

  Owner: Aidan Barends (230255639)
*/

import { ImageSquare } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Card } from '@/components/ui/Card'
import { listingsApi } from '@/lib/api/listings'
import type { Listing } from '@/lib/api/types'
import { safeUrl } from '@/lib/safeUrl'

const MAX_RELATED = 6

const currencyFormatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })

type RelatedListingsProps = {
  currentListingId: number
  categoryId: number
  campusId: number
  /** `row` = swipeable strip (main column), `list` = compact rail list. */
  layout?: 'row' | 'list'
}

type RelatedItem = Listing & { imageUrl: string | null }

type LoadState =
  | { status: 'loading' }
  | { status: 'done'; items: RelatedItem[] }

export function RelatedListings({
  currentListingId,
  categoryId,
  campusId,
  layout = 'row',
}: RelatedListingsProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState({ status: 'loading' })

      let matches: Listing[]
      try {
        matches = await listingsApi.search({ campusId, categoryId })
      } catch {
        if (!cancelled) setState({ status: 'done', items: [] })
        return
      }

      const shortlist = matches
        .filter((listing) => listing.listingId !== currentListingId && listing.status === 'ACTIVE')
        .slice(0, MAX_RELATED)

      const withImages = await Promise.all(
        shortlist.map(async (listing) => {
          try {
            const images = await listingsApi.imagesFor(listing.listingId)
            const chosen = images.find((image) => image.primary) ?? images[0]
            return { ...listing, imageUrl: chosen?.imageUrl ?? null }
          } catch {
            return { ...listing, imageUrl: null }
          }
        }),
      )

      if (!cancelled) setState({ status: 'done', items: withImages })
    }

    void Promise.resolve().then(load)
    return () => {
      cancelled = true
    }
  }, [currentListingId, categoryId, campusId])

  if (state.status === 'done' && state.items.length === 0) return null

  const loading = state.status === 'loading'
  const items = state.status === 'done' ? state.items : []

  if (layout === 'list') {
    return (
      <Card padding="none" className="p-2">
        <h2 className="px-2 pb-1 pt-2 text-sm font-semibold text-fg">More like this</h2>
        <ul aria-busy={loading || undefined}>
          {loading
            ? Array.from({ length: 3 }, (_, index) => (
                <li key={index} aria-hidden="true" className="flex items-center gap-3 p-2">
                  <div className="size-14 animate-pulse rounded-xl bg-surface-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 animate-pulse rounded-md bg-surface-muted" />
                    <div className="h-3.5 w-1/3 animate-pulse rounded-md bg-surface-muted" />
                  </div>
                </li>
              ))
            : items.map((item) => (
                <li key={item.listingId}>
                  <Link
                    to={`/listings/${item.listingId}`}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-muted active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand-500"
                  >
                    <Thumb item={item} className="size-14 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium text-fg">{item.title}</p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">
                        {currencyFormatter.format(item.price)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
        </ul>
      </Card>
    )
  }

  return (
    <section aria-busy={loading || undefined}>
      <h2 className="mb-3 text-base font-semibold text-fg">More like this</h2>

      <div className="scroller-x -mx-3 flex scroll-px-3 gap-3 px-3 pb-2 sm:-mx-4 sm:scroll-px-4 sm:px-4">
        {loading
          ? Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="glass-card w-40 shrink-0 overflow-hidden rounded-2xl border"
              >
                <div className="aspect-square animate-pulse bg-surface-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-3.5 w-3/4 animate-pulse rounded-md bg-surface-muted" />
                  <div className="h-3.5 w-1/3 animate-pulse rounded-md bg-surface-muted" />
                </div>
              </div>
            ))
          : items.map((item) => (
              <Card
                key={item.listingId}
                to={`/listings/${item.listingId}`}
                padding="none"
                className="w-40 shrink-0 snap-start overflow-hidden active:scale-[0.98] sm:w-44"
              >
                <Thumb item={item} className="aspect-square w-full" />
                <div className="p-3">
                  <p className="text-sm font-bold tabular-nums text-fg">
                    {currencyFormatter.format(item.price)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-fg">{item.title}</p>
                </div>
              </Card>
            ))}
        <span aria-hidden="true" className="w-1 shrink-0" />
      </div>
    </section>
  )
}

function Thumb({ item, className }: { item: RelatedItem; className: string }) {
  return (
    <div className={`overflow-hidden bg-linear-to-br from-brand-50 via-surface-muted to-brand-100 ${className}`}>
      {safeUrl(item.imageUrl) ? (
        <img
          src={safeUrl(item.imageUrl)}
          alt={item.title}
          loading="lazy"
          className="size-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <div className="grid size-full place-items-center text-brand-600">
          <ImageSquare aria-hidden="true" weight="duotone" className="size-7 opacity-70" />
        </div>
      )}
    </div>
  )
}
