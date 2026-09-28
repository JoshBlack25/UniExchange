/*
  One icon per bulletin category, so the filter chips, the rail filter and
  each post's footer all agree on what "Study Group" looks like.

  `category={null}` is the "All posts" pseudo-category.
*/

import {
  BookOpenText,
  CalendarBlank,
  ChatText,
  MagnifyingGlass,
  SquaresFour,
  type IconWeight,
} from '@phosphor-icons/react'

import type { BulletinPostCategory } from '@/lib/api/types'

type BulletinCategoryIconProps = {
  category: BulletinPostCategory | null
  className?: string
  weight?: IconWeight
}

export function BulletinCategoryIcon({ category, className = 'size-4', weight = 'regular' }: BulletinCategoryIconProps) {
  const props = { className, weight, 'aria-hidden': true } as const

  switch (category) {
    case null:
      return <SquaresFour {...props} />
    case 'EVENT':
      return <CalendarBlank {...props} />
    case 'STUDY_GROUP':
      return <BookOpenText {...props} />
    case 'LOST_AND_FOUND':
      return <MagnifyingGlass {...props} />
    default:
      return <ChatText {...props} />
  }
}
