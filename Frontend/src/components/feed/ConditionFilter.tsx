/*
  ConditionFilter - the "Condition" block from the desktop mockup:
  a pill toggle group (Any / Brand New / Like New / Fair / Good) plus a
  max price slider. Lives inside the feed's Filters sheet.

  STRUCTURE ONLY FOR NOW: this does not touch the search request in
  FeedPage. Listing/ListingRequest has no `condition` field on the backend
  yet, so there's nothing to filter by. Once that field exists, pass it into
  listingsApi.search(...) the same way categoryId/campusId already work.

  The sheet unmounts its content when closed, so the parent may pass
  `value`/`onChange` to keep the picks between openings; without them the
  component falls back to its own local state, as before.

  Owner: Joshua Reid Adams (230317693)
*/

import { useState } from "react";

import {
  CONDITION_MAX_PRICE,
  CONDITION_OPTIONS,
  DEFAULT_CONDITION,
  type ConditionValue,
} from "./conditionOptions";

type ConditionFilterProps = {
  value?: ConditionValue;
  onChange?: (value: ConditionValue) => void;
};

const PILL_BASE =
  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition duration-150 active:scale-[0.97] sm:min-h-10 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";
const PILL_ACTIVE = "border-transparent bg-primary text-on-primary shadow-sm";
const PILL_IDLE =
  "border-line-strong bg-surface text-fg hover:border-brand-300";

const zar = (amount: number) => `R ${amount.toLocaleString("en-ZA")}`;

export function ConditionFilter({ value, onChange }: ConditionFilterProps) {
  const [local, setLocal] = useState<ConditionValue>(DEFAULT_CONDITION);
  const current = value ?? local;
  const update = (next: Partial<ConditionValue>) => {
    const merged = { ...current, ...next };
    if (onChange) onChange(merged);
    else setLocal(merged);
  };

  return (
    <div>
      <fieldset>
        <legend className="text-sm font-semibold text-fg">Condition</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {CONDITION_OPTIONS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => update({ condition: label })}
              aria-pressed={current.condition === label}
              className={`${PILL_BASE} ${current.condition === label ? PILL_ACTIVE : PILL_IDLE}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="feedMaxPrice" className="font-semibold text-fg">
            Max price
          </label>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold tabular-nums text-brand-800">
            {current.maxPrice >= CONDITION_MAX_PRICE
              ? `${zar(CONDITION_MAX_PRICE)}+`
              : zar(current.maxPrice)}
          </span>
        </div>
        <input
          id="feedMaxPrice"
          type="range"
          min={0}
          max={CONDITION_MAX_PRICE}
          step={50}
          value={current.maxPrice}
          onChange={(event) => update({ maxPrice: Number(event.target.value) })}
          className="mt-3 h-6 w-full cursor-pointer accent-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        />
        <div className="mt-1 flex justify-between text-xs tabular-nums text-fg-muted">
          <span>R 0</span>
          <span>{zar(CONDITION_MAX_PRICE)}+</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-fg-muted">
        Condition and price filtering arrive once listings carry a condition
        field - for now these don't change the results.
      </p>
    </div>
  );
}
