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
  menuItems: [UPDATE_TYPES.MENU_ITEM],
  parent: [UPDATE_TYPES.PARENT],
  description: [UPDATE_TYPES.DESCRIPTION],
  rating: [UPDATE_TYPES.AGGREGATE_RATING],
  tags: [UPDATE_TYPES.TAG_CATEGORY_ITEM, UPDATE_TYPES.TAG_CATEGORY],
  gallery: [UPDATE_TYPES.IMAGE_GALLERY_ITEM],
  price: [UPDATE_TYPES.PRICE],
  workHours: [UPDATE_TYPES.WORK_HOURS],
  address: [UPDATE_TYPES.ADDRESS],
  geo: [UPDATE_TYPES.GEO],
  websites: [UPDATE_TYPES.WEBSITE],
  phones: [UPDATE_TYPES.TELEPHONE],
  email: [UPDATE_TYPES.EMAIL],
  walletAddress: [UPDATE_TYPES.WALLET_ADDRESS],
  identifier: [UPDATE_TYPES.IDENTIFIER],
  link: [UPDATE_TYPES.LINK],
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
