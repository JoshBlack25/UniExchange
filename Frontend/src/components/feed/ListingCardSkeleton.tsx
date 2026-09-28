/*
  ListingCardSkeleton - pulsing placeholder shown while the feed's first load
  is in flight (the standard skeleton-loading pattern from Preline's catalog).

  Mirrors ListingCard's exact shape (square tile, price, two title lines,
  meta line, seller row) so the swap from skeleton to content does not jump.
  Purely decorative, hence aria-hidden.

  Owner: Joshua Reid Adams (230317693)
*/

export function ListingCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="glass-card overflow-hidden rounded-2xl border shadow-glass"
    >
      <div className="aspect-square animate-pulse bg-surface-muted" />
      <div className="space-y-2 p-2.5 sm:p-3">
        <div className="h-5 w-1/3 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-3.5 w-11/12 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-3.5 w-2/3 animate-pulse rounded-md bg-surface-muted" />
        <div className="flex items-center gap-1.5 pt-2">
          <div className="size-5 animate-pulse rounded-full bg-surface-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded-md bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}
