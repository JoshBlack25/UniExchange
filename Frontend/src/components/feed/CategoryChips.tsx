/*
  CategoryChips - the category filter row from the T2 mobile mockup
  ("All Items | Textbooks | Electronics"). Horizontally scrollable
  (`scroller-x`, snaps per chip) with a soft fade at the trailing edge so it is
  obvious there is more to swipe to. Thumb-sized: 44px tall on phones.

  Shown at every breakpoint now - the feed no longer has its own left rail
  (the global LeftSidebar lives there), so this row is the quick category
  switcher everywhere and the Filters sheet holds the full list with counts.

  Owner: Joshua Reid Adams (230317693)
*/

import { SquaresFour } from "@phosphor-icons/react";

import { CategoryIcon } from "./CategoryIcon";
import type { Category } from "@/lib/api/types";

type CategoryChipsProps = {
  categories: Category[];
  /** null means "All Items". */
  activeCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
};

const CHIP_BASE =
  "inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium " +
  "transition duration-150 active:scale-[0.97] sm:min-h-10 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";
const CHIP_ACTIVE = "border-transparent bg-primary text-on-primary shadow-sm";
const CHIP_IDLE =
  "glass-card border-line text-fg hover:border-brand-300 hover:text-brand-700";

/* Fades the trailing 32px so the row reads as scrollable. */
const EDGE_FADE =
  "[mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]";

export function CategoryChips({
  categories,
  activeCategoryId,
  onSelectCategory,
}: CategoryChipsProps) {
  return (
    <div
      className={`scroller-x -mx-3 flex scroll-px-3 gap-2 px-3 py-1 sm:-mx-1 sm:scroll-px-1 sm:px-1 ${EDGE_FADE}`}
      role="tablist"
      aria-label="Categories"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeCategoryId === null}
        onClick={() => onSelectCategory(null)}
        className={`${CHIP_BASE} ${activeCategoryId === null ? CHIP_ACTIVE : CHIP_IDLE}`}
      >
        <SquaresFour
          aria-hidden="true"
          weight={activeCategoryId === null ? "fill" : "regular"}
          className="size-4"
        />
        All items
      </button>

      {categories.map((category) => {
        const active = activeCategoryId === category.categoryId;
        return (
          <button
            key={category.categoryId}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelectCategory(category.categoryId)}
            className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
          >
            <CategoryIcon
              name={category.name}
              weight={active ? "fill" : "regular"}
              className="size-4"
            />
            {category.name}
          </button>
        );
      })}

      {/* Trailing spacer so the last chip can scroll clear of the fade. */}
      <span aria-hidden="true" className="w-6 shrink-0" />
    </div>
  );
}
