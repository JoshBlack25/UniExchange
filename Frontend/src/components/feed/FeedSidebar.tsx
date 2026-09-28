/*
  FeedSidebar - the category + condition filter controls from the T2 desktop
  mockup's left rail: the Categories list with counts ("All Categories 342")
  and the Condition filter.

  It used to be its own sticky left column, but the app now has a global
  LeftSidebar, so three rails was one too many. FeedPage now renders this
  inside the "Filters" Sheet (bottom sheet on phones, right panel on
  desktop). The Sell button moved to the feed's "What are you selling?"
  composer strip and the TrustCallout moved to the right rail.

  Counts are ACTIVE listings per category, computed once in FeedPage from a
  single GET /api/listings call.

  Owner: Joshua Reid Adams (230317693)
*/

import { Check, SquaresFour } from "@phosphor-icons/react";

import { CategoryIcon } from "./CategoryIcon";
import { ConditionFilter } from "./ConditionFilter";
import type { ConditionValue } from "./conditionOptions";
import type { Category } from "@/lib/api/types";

type FeedSidebarProps = {
  categories: Category[];
  /** categoryId -> number of ACTIVE listings, from FeedPage. */
  counts: Record<number, number>;
  /** Total ACTIVE listings across all categories (the "All Categories" count). */
  totalActive: number;
  /** null means "All Categories". */
  activeCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  condition?: ConditionValue;
  onConditionChange?: (value: ConditionValue) => void;
};

const ROW =
  "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition duration-150 active:scale-[0.99] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";
const ROW_ACTIVE = "bg-brand-50 font-semibold text-brand-800";
const ROW_IDLE = "text-fg hover:bg-surface-muted";

export function FeedSidebar({
  categories,
  counts,
  totalActive,
  activeCategoryId,
  onSelectCategory,
  condition,
  onConditionChange,
}: FeedSidebarProps) {
  const rows: { id: number | null; name: string; count: number }[] = [
    { id: null, name: "All categories", count: totalActive },
    ...categories.map((category) => ({
      id: category.categoryId,
      name: category.name,
      count: counts[category.categoryId] ?? 0,
    })),
  ];

  return (
    <div className="space-y-6">
      <section aria-labelledby="feed-filter-categories">
        <h3
          id="feed-filter-categories"
          className="text-sm font-semibold text-fg"
        >
          Category
        </h3>
        <ul className="mt-2 space-y-1">
          {rows.map((row) => {
            const active = activeCategoryId === row.id;
            return (
              <li key={row.id ?? "all"}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(row.id)}
                  aria-pressed={active}
                  className={`${ROW} ${active ? ROW_ACTIVE : ROW_IDLE}`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full ${
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-surface-muted text-fg-muted"
                    }`}
                  >
                    {row.id === null ? (
                      <SquaresFour aria-hidden="true" className="size-4" />
                    ) : (
                      <CategoryIcon name={row.name} className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{row.name}</span>
                  <span
                    className={`text-xs tabular-nums ${active ? "text-brand-800" : "text-fg-muted"}`}
                  >
                    {row.count}
                  </span>
                  {active && (
                    <Check
                      aria-hidden="true"
                      weight="bold"
                      className="size-4 text-brand-700"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="border-t border-line pt-5">
        <ConditionFilter value={condition} onChange={onConditionChange} />
      </div>
    </div>
  );
}
