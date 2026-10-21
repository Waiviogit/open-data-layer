/** Update types resolved before projecting favorites cards (same as shop). */
export const FAVORITES_CARD_UPDATE_TYPES = [
  'name',
  'image',
  'parent',
  'description',
  'tagCategoryItem',
  'aggregateRating',
  'identifier',
] as const;

/** Favorites map list/markers include geo coordinates. */
export const FAVORITES_MAP_UPDATE_TYPES = [
  ...FAVORITES_CARD_UPDATE_TYPES,
  'geo',
  'address',
] as const;
