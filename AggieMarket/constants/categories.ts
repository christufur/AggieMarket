/**
 * Category and condition options for chips, dropdowns, and filters.
 */
export const CATEGORIES = [
  "All",
  "Textbooks",
  "Electronics",
  "Furniture",
  "Services",
  "Events",
] as const;

export const CONDITIONS = [
  "New",
  "Like New",
  "Good",
  "Fair",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Condition = (typeof CONDITIONS)[number];
