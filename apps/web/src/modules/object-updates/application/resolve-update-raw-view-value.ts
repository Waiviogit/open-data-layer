import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { ObjectUpdateFeedItemView } from './dto/object-updates-feed.dto';

const COLLAPSED_RAW_JSON_UPDATE_TYPES = new Set<string>([
  UPDATE_TYPES.IMAGE,
  UPDATE_TYPES.IMAGE_BACKGROUND,
  UPDATE_TYPES.IMAGE_GALLERY_ITEM,
  UPDATE_TYPES.GEO,
]);

/** Image and map cards already show a preview; raw JSON stays behind View JSON. */
export function isCollapsedRawJsonUpdate(updateType: string): boolean {
  return COLLAPSED_RAW_JSON_UPDATE_TYPES.has(updateType);
}

export function resolveUpdateRawViewValue(
  item: Pick<ObjectUpdateFeedItemView, 'value_json' | 'value_geo'>,
): unknown | null {
  if (item.value_json != null) {
    return item.value_json;
  }
  if (item.value_geo != null) {
    return item.value_geo;
  }
  return null;
}
