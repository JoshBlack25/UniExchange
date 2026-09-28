/*
  Right-rail filter for the bulletin (xl and up - below that the same state is
  driven by CategoryFilterChips at the top of the feed).

  Rendered as a Facebook-style list of shortcuts rather than checkboxes: only
  one category can be active at a time, and a checkbox promised multi-select.
  Each row is a toggle button (aria-pressed); picking the active one again
  goes back to All posts.

  There is no trending-tags section: the backend has no tags entity, so a
  placeholder list would only advertise something that does not exist.
*/

import { BulletinCategoryIcon } from '@/components/bulletin/CategoryIcon'
import { CATEGORY_LABELS, FILTERABLE_CATEGORIES } from '@/components/bulletin/categoryLabels'
import { Card } from '@/components/ui/Card'
import type { BulletinPostCategory } from '@/lib/api/types'

type FilterFeedSidebarProps = {
  selected: BulletinPostCategory | null
  onSelect: (category: BulletinPostCategory | null) => void
}

export function FilterFeedSidebar({ selected, onSelect }: FilterFeedSidebarProps) {
  const options: Array<BulletinPostCategory | null> = [null, ...FILTERABLE_CATEGORIES]

  return (
    <Card padding="sm">
      <h2 className="px-2 pb-2 pt-1 text-base font-semibold text-fg">Filter feed</h2>

      <ul className="space-y-0.5">
        {options.map((category) => {
          const active = selected === category
          return (
            <li key={category ?? 'ALL'}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(category === null || active ? null : category)}
                className={
                  'flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm font-medium transition ' +
                  'active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
                  (active ? 'bg-brand-50 text-brand-800' : 'text-fg hover:bg-surface-muted')
                }
              >
                <span
                  className={
                    'grid size-9 shrink-0 place-items-center rounded-full ' +
                    (active ? 'bg-primary text-on-primary' : 'bg-surface-muted text-fg-muted')
                  }
                >
                  <BulletinCategoryIcon category={category} weight={active ? 'fill' : 'regular'} className="size-4.5" />
                </span>
                {category === null ? 'All posts' : CATEGORY_LABELS[category]}
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
