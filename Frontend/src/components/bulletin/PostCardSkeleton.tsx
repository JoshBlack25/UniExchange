/*
  Pulsing placeholder in the shape of a PostCard, shown while the bulletin
  loads so the feed doesn't jump when the real posts arrive. Decorative only -
  the page announces the loading state separately.
*/

export function PostCardSkeleton({ withImage = false }: { withImage?: boolean }) {
  return (
    <div aria-hidden="true" className="glass-card rounded-2xl border shadow-glass">
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="size-10 animate-pulse rounded-full bg-surface-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
      <div className="space-y-2 px-4 pt-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3.5 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-3.5 w-5/6 animate-pulse rounded bg-surface-muted" />
      </div>
      {withImage && <div className="mt-4 aspect-video animate-pulse bg-surface-muted" />}
      <div className="mx-4 mt-3 border-t border-line py-3">
        <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  )
}
