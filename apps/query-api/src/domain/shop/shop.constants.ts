/** Update types resolved before projecting shop / recipe cards. */
export const SHOP_CARD_UPDATE_TYPES = [
  'name',
  'image',
  'description',
  'tagCategoryItem',
  'aggregateRating',
] as const;

/** Sample objects per category row in sections mode (fixed; not the section page size). */
export const SHOP_SECTION_OBJECTS_PER_CATEGORY = 3;
