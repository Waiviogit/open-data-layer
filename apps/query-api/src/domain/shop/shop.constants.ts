/** Update types resolved before projecting shop / recipe cards. */
export const SHOP_CARD_UPDATE_TYPES = [
  'name',
  'image',
  'parent',
  'price',
  'brand',
  'description',
  'tagCategoryItem',
  'aggregateRating',
  'title',
  'address',
  'identifier',
] as const;

/** Sample objects per category row in sections mode (fixed; not the section page size). */
export const SHOP_SECTION_OBJECTS_PER_CATEGORY = 3;

/** Legacy Waivio shop rating filter thresholds (10-point scale; UI shows stars / 2). */
export const SHOP_RATING_FILTER_THRESHOLDS = [10, 8, 6] as const;

export type ShopRatingFilterThreshold = (typeof SHOP_RATING_FILTER_THRESHOLDS)[number];

/** Maps legacy threshold to ODL rank_score (5★ = 10000). */
export function shopRatingThresholdToRank(threshold: number): number {
  return threshold * 1000;
}
