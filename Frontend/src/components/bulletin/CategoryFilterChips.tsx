/*
  The bulletin's category filter as a row of chips - the phone/tablet version
  of FilterFeedSidebar, and the same state (BulletinPage's selectedCategory).
  Hidden from xl, where the right rail shows the full filter card instead.

  A horizontal scroller (scroller-x) so all five chips stay one thumb-swipe
  away on a 390px screen without wrapping into a second row.
*/

import { BulletinCategoryIcon } from '@/components/bulletin/CategoryIcon'
import { CATEGORY_LABELS, FILTERABLE_CATEGORIES } from '@/components/bulletin/categoryLabels'
import type { BulletinPostCategory } from '@/lib/api/types'

type CategoryFilterChipsProps = {
  selected: BulletinPostCategory | null
  onSelect: (category: BulletinPostCategory | null) => void
  className?: string
}

const CHIP =
  'inline-flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold ' +
  'transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
const ACTIVE = 'border-transparent bg-primary text-on-primary shadow-sm shadow-primary/25'
const IDLE = 'glass-card border-line text-fg hover:border-brand-300'

export function CategoryFilterChips({ selected, onSelect, className = '' }: CategoryFilterChipsProps) {
  const options: Array<BulletinPostCategory | null> = [null, ...FILTERABLE_CATEGORIES]

  return (
    <div
      role="group"
      aria-label="Filter posts by category"
      className={`scroller-x -mx-3 flex scroll-px-3 gap-2 px-3 py-1 sm:-mx-4 sm:scroll-px-4 sm:px-4 ${className}`}
    >
      {options.map((category) => {
        const active = selected === category
        return (
          <button
            key={category ?? 'ALL'}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(category)}
            className={`${CHIP} ${active ? ACTIVE : IDLE}`}
          >
            <BulletinCategoryIcon category={category} weight={active ? 'fill' : 'regular'} className="size-4" />
            {category === null ? 'All posts' : CATEGORY_LABELS[category]}
          </button>
        )
      })}
    </div>
  )
}
