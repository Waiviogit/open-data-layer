import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { ObjectLeftRailBlock } from '@/modules/object/domain/object-page.types';

export type ObjectLeftRailBlockKind = ObjectLeftRailBlock['kind'];

/**
 * Maps left-rail block kinds to ODL `update_type` strings ({@link UPDATE_TYPES} values).
 * One block may map to multiple types (e.g. tags → tagCategory + tagCategoryItem).
 */
export const BLOCK_KIND_TO_UPDATE_TYPES: Record<ObjectLeftRailBlockKind, readonly string[]> = {
  name: [UPDATE_TYPES.NAME],
  title: [UPDATE_TYPES.TITLE],
  image: [UPDATE_TYPES.IMAGE],
  imageBackground: [UPDATE_TYPES.IMAGE_BACKGROUND],
  status: [UPDATE_TYPES.STATUS],
  compareAtPrice: [UPDATE_TYPES.COMPARE_AT_PRICE],
  saleEvent: [UPDATE_TYPES.SALE_EVENT],
  size: [UPDATE_TYPES.SIZE],
  brand: [UPDATE_TYPES.BRAND],
  manufacturer: [UPDATE_TYPES.MANUFACTURER],
  merchant: [UPDATE_TYPES.MERCHANT],
  featureList: [UPDATE_TYPES.FEATURE_LIST],
  category: [UPDATE_TYPES.CATEGORY],
  calories: [UPDATE_TYPES.CALORIES],
  budget: [UPDATE_TYPES.BUDGET],
  cookTime: [UPDATE_TYPES.COOK_TIME],
  ingredients: [UPDATE_TYPES.INGREDIENTS],
  nutrition: [UPDATE_TYPES.NUTRITION],
  author: [UPDATE_TYPES.AUTHOR],
  publisher: [UPDATE_TYPES.PUBLISHER],
  datePublished: [UPDATE_TYPES.DATE_PUBLISHED],
  inLanguage: [UPDATE_TYPES.IN_LANGUAGE],
  typicalAgeRange: [UPDATE_TYPES.TYPICAL_AGE_RANGE],
  printLength: [UPDATE_TYPES.PRINT_LENGTH],
  menuItems: [UPDATE_TYPES.MENU_ITEM],
  parent: [UPDATE_TYPES.PARENT],
  description: [UPDATE_TYPES.DESCRIPTION],
  button: [UPDATE_TYPES.BUTTON],
  rating: [UPDATE_TYPES.AGGREGATE_RATING],
  tags: [UPDATE_TYPES.TAG_CATEGORY_ITEM, UPDATE_TYPES.TAG_CATEGORY],
  gallery: [UPDATE_TYPES.IMAGE_GALLERY_ITEM],
  price: [UPDATE_TYPES.PRICE],
  options: [UPDATE_TYPES.OPTION],
  workHours: [UPDATE_TYPES.WORK_HOURS],
  address: [UPDATE_TYPES.ADDRESS],
  geo: [UPDATE_TYPES.GEO],
  websites: [UPDATE_TYPES.WEBSITE],
  productWeight: [UPDATE_TYPES.PRODUCT_WEIGHT],
  phones: [UPDATE_TYPES.TELEPHONE],
  email: [UPDATE_TYPES.EMAIL],
  walletAddress: [UPDATE_TYPES.WALLET_ADDRESS],
  identifier: [UPDATE_TYPES.IDENTIFIER],
  productGroupId: [UPDATE_TYPES.PRODUCT_GROUP_ID],
  link: [UPDATE_TYPES.LINK],
  sortCustom: [UPDATE_TYPES.SORT_CUSTOM],
  promotion: [UPDATE_TYPES.PROMOTION],
  pin: [UPDATE_TYPES.PIN],
  remove: [UPDATE_TYPES.REMOVE],
  delegation: [UPDATE_TYPES.DELEGATION],
  license: [UPDATE_TYPES.LICENSE],
  compatibility: [UPDATE_TYPES.COMPATIBILITY],
  metadata: [UPDATE_TYPES.METADATA],
  allowedTools: [UPDATE_TYPES.ALLOWED_TOOLS],
  references: [UPDATE_TYPES.REFERENCES],
  objectControl: [UPDATE_TYPES.OBJECT_CONTROL],
  admins: [UPDATE_TYPES.ADMINS],
  moderators: [UPDATE_TYPES.MODERATORS],
  trusted: [UPDATE_TYPES.TRUSTED],
  authorities: [UPDATE_TYPES.AUTHORITIES],
  whitelist: [UPDATE_TYPES.WHITELIST],
  restricted: [UPDATE_TYPES.RESTRICTED],
  banned: [UPDATE_TYPES.BANNED],
  inheritsFrom: [UPDATE_TYPES.INHERITS_FROM],
  validityCutoff: [UPDATE_TYPES.VALIDITY_CUTOFF],
};

export function getUpdateTypesForBlockKind(
  kind: ObjectLeftRailBlockKind,
  supportedUpdateTypes: readonly string[],
): string[] {
  const candidates = BLOCK_KIND_TO_UPDATE_TYPES[kind];
  const supported = new Set(supportedUpdateTypes);
  return candidates.filter((t) => supported.has(t));
}

/** First candidate for a block kind (same ordering as {@link BLOCK_KIND_TO_UPDATE_TYPES}). */
export function primaryUpdateTypeForBlockKind(
  kind: ObjectLeftRailBlockKind,
  supportedUpdateTypes: readonly string[],
): string | undefined {
  const candidates = getUpdateTypesForBlockKind(kind, supportedUpdateTypes);
  return candidates[0];
}

/**
 * Best `update_type` filter for the updates feed when a left-rail block is selected.
 * Single-type blocks return that type; multi-type blocks pick the supported type with the highest count.
 */
export function resolveUpdateTypeFilterForBlockKind(
  kind: ObjectLeftRailBlockKind,
  supportedUpdateTypes: readonly string[],
  counts: Record<string, number>,
): string | undefined {
  const candidates = getUpdateTypesForBlockKind(kind, supportedUpdateTypes);
  if (candidates.length === 0) {
    return undefined;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }
  return candidates.reduce((best, candidate) =>
    (counts[candidate] ?? 0) > (counts[best] ?? 0) ? candidate : best,
  );
}

/**
 * Update count for a left-rail badge. Matches the feed filter for multi-type blocks
 * (e.g. tags: `tagCategoryItem` only, not `tagCategory` + `tagCategoryItem`).
 */
export function resolveUpdateCountForBlockKind(
  kind: ObjectLeftRailBlockKind,
  supportedUpdateTypes: readonly string[],
  counts: Record<string, number>,
): number {
  const filterType = resolveUpdateTypeFilterForBlockKind(
    kind,
    supportedUpdateTypes,
    counts,
  );
  if (!filterType) {
    return 0;
  }
  return counts[filterType] ?? 0;
}
