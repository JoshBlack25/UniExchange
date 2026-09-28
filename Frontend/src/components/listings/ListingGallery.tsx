/*
  Photo gallery for the listing page.

  A scroll-snap carousel: swipe between photos on a phone, or use the
  previous/next buttons (sm and up) and the thumbnail strip (md and up).
  Dots under the photo show the position. Opens on the primary image.
  Native scrolling does the work, so it respects the OS "reduce motion"
  setting and needs no gesture library.

  Owner: Aidan Barends (230255639)
*/

import { CaretLeft, CaretRight, ImageSquare } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'

import type { ListingImage } from '@/lib/api/types'
import { safeUrl } from '@/lib/safeUrl'

type ListingGalleryProps = {
  images: ListingImage[]
  title: string
}

const NAV_BUTTON =
  'glass-strong absolute top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full border text-fg shadow-float ' +
  'transition hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-0 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:grid'

export function ListingGallery({ images, title }: ListingGalleryProps) {
  const primaryIndex = Math.max(
    0,
    images.findIndex((image) => image.primary),
  )
  const [activeIndex, setActiveIndex] = useState(primaryIndex)
  const track = useRef<HTMLDivElement>(null)

  // Start on the primary photo (no animation - it's the initial position).
  useEffect(() => {
    const el = track.current
    if (el && primaryIndex > 0) el.scrollLeft = primaryIndex * el.clientWidth
  }, [primaryIndex, images.length])

  if (images.length === 0) {
    return (
      <div className="glass-card grid aspect-video w-full place-items-center sm:aspect-4/3 rounded-2xl border shadow-glass">
        <div className="text-center text-fg-muted">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-surface-muted">
            <ImageSquare aria-hidden="true" weight="duotone" className="size-8" />
          </span>
          <p className="mt-3 text-sm font-medium">No photos yet</p>
        </div>
      </div>
    )
  }

  const current = Math.min(activeIndex, images.length - 1)

  const goTo = (index: number) => {
    const el = track.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: index * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
  }

  const onScroll = () => {
    const el = track.current
    if (!el || el.clientWidth === 0) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    if (index !== activeIndex) setActiveIndex(index)
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-muted shadow-glass">
        <div
          ref={track}
          onScroll={onScroll}
          className="flex aspect-4/3 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-roledescription="carousel"
          aria-label={`${title} photos`}
        >
          {images.map((image, index) => (
            <div
              key={image.imageId}
              className="size-full shrink-0 snap-center"
              role="group"
              aria-roledescription="slide"
              aria-label={`Photo ${index + 1} of ${images.length}`}
            >
              <img
                src={safeUrl(image.imageUrl)}
                alt={index === 0 ? title : `${title} - photo ${index + 1}`}
                loading={index === primaryIndex ? 'eager' : 'lazy'}
                className="size-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              disabled={current === 0}
              onClick={() => goTo(current - 1)}
              className={`${NAV_BUTTON} left-3`}
            >
              <CaretLeft aria-hidden="true" weight="bold" className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              disabled={current === images.length - 1}
              onClick={() => goTo(current + 1)}
              className={`${NAV_BUTTON} right-3`}
            >
              <CaretRight aria-hidden="true" weight="bold" className="size-5" />
            </button>

            <span className="absolute right-3 top-3 rounded-full bg-slate-950/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm">
              {current + 1} / {images.length}
            </span>

            {/* Position dots. Decorative on touch (swipe is the input); the
                buttons are 24px targets with the dot drawn inside. */}
            <div className="absolute inset-x-0 bottom-2 flex justify-center">
              <div className="flex items-center rounded-full bg-slate-950/45 px-1.5 backdrop-blur-sm">
                {images.map((image, index) => (
                  <button
                    key={image.imageId}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Show photo ${index + 1} of ${images.length}`}
                    aria-current={index === current ? 'true' : undefined}
                    className="grid size-6 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <span
                      className={`block h-1.5 rounded-full bg-white transition-all ${
                        index === current ? 'w-4' : 'w-1.5 opacity-60'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="scroller-x mt-3 hidden gap-2 pb-1 md:flex">
          {images.map((image, index) => (
            <button
              key={image.imageId}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Show photo ${index + 1} of ${images.length}`}
              aria-pressed={index === current}
              className={`size-16 shrink-0 snap-start overflow-hidden rounded-xl border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                index === current
                  ? 'border-brand-500'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={safeUrl(image.imageUrl)} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
