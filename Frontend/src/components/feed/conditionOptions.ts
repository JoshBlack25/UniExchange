/*
  Constants for ConditionFilter, kept out of the component file so Vite fast
  refresh keeps working (a .tsx module should only export components).

  Owner: Joshua Reid Adams (230317693)
*/

export const CONDITION_OPTIONS = ["Any", "Brand New", "Like New", "Fair / Good"] as const;

export const CONDITION_MAX_PRICE = 10_000;

export type ConditionValue = {
  condition: (typeof CONDITION_OPTIONS)[number];
  maxPrice: number;
};

export const DEFAULT_CONDITION: ConditionValue = {
  condition: "Any",
  maxPrice: CONDITION_MAX_PRICE,
};
