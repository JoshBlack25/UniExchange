/*
  ActiveFilters - the result toolbar: "N results" plus one removable pill per
  active filter (campus, category, search) and a Clear-all action.

  Makes the hyper-local filtering visible and always reversible - a tap on a
  pill removes just that filter. Pills are 36px tall with the whole pill as
  the hit area, so they are easy to hit on a phone.

  Owner: Joshua Reid Adams (230317693)
*/

import { X } from "@phosphor-icons/react";

type ActiveFiltersProps = {
  resultCount: number;
  campusName?: string;
  categoryName?: string;
  search?: string;
  onClearCampus: () => void;
  onClearCategory: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
};

function FilterPill({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Clear ${label} filter: ${value}`}
      className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full bg-brand-50 pl-3 pr-2 text-xs font-semibold text-brand-800 transition hover:bg-brand-100 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <span className="truncate">{value}</span>
      <X aria-hidden="true" weight="bold" className="size-3.5 shrink-0" />
    </button>
  );
}

export function ActiveFilters({
  resultCount,
  campusName,
  categoryName,
  search,
  onClearCampus,
  onClearCategory,
  onClearSearch,
  onClearAll,
}: ActiveFiltersProps) {
  const hasAny = Boolean(campusName || categoryName || search);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <p
        className="text-sm font-medium tabular-nums text-fg-muted"
        aria-live="polite"
      >
        {resultCount} {resultCount === 1 ? "result" : "results"}
      </p>

      {campusName && (
        <FilterPill label="campus" value={campusName} onClear={onClearCampus} />
      )}
      {categoryName && (
        <FilterPill
          label="category"
          value={categoryName}
          onClear={onClearCategory}
        />
      )}
      {search && (
        <FilterPill
          label="search"
          value={`“${search}”`}
          onClear={onClearSearch}
        />
      )}

      {hasAny && (
        <button
          type="button"
          onClick={onClearAll}
          className="min-h-9 rounded-full px-2 text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
