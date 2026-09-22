import { OBJECT_TYPES, type ObjectType } from '@opden-data-layer/core/object-type-registry';

import type { IconName } from '@/icons';

/** Glyph for the Users row in the discover sidebar. */
export const DISCOVER_USERS_ICON = 'users' satisfies IconName;

/** One Lucide glyph per registry object type, used by the discover sidebar and mobile type sheet. */
export const DISCOVER_TYPE_ICONS: Record<ObjectType, IconName> = {
  [OBJECT_TYPES.PRODUCT]: 'package',
  [OBJECT_TYPES.BOOK]: 'book',
  [OBJECT_TYPES.BUSINESS]: 'building',
  [OBJECT_TYPES.RESTAURANT]: 'utensils',
  [OBJECT_TYPES.PERSON]: 'user',
  [OBJECT_TYPES.DRINK]: 'cup-soda',
  [OBJECT_TYPES.DISH]: 'utensils-crossed',
  [OBJECT_TYPES.AFFILIATE]: 'share',
  [OBJECT_TYPES.GOVERNANCE]: 'landmark',
  [OBJECT_TYPES.GROUP]: 'users',
  [OBJECT_TYPES.HASHTAG]: 'hash',
  [OBJECT_TYPES.HTML]: 'code',
  [OBJECT_TYPES.LEGAL_DOCUMENT]: 'file-text',
  [OBJECT_TYPES.LIST]: 'list',
  [OBJECT_TYPES.PLACE]: 'map-pin',
  [OBJECT_TYPES.PAGE]: 'file-text',
  [OBJECT_TYPES.SERVICE]: 'briefcase',
  [OBJECT_TYPES.WIDGET]: 'puzzle',
  [OBJECT_TYPES.NEWSFEED]: 'rss',
  [OBJECT_TYPES.SHOP]: 'store',
  [OBJECT_TYPES.WEBPAGE]: 'globe',
  [OBJECT_TYPES.MAP]: 'map',
  [OBJECT_TYPES.LINK]: 'link',
  [OBJECT_TYPES.RECIPE]: 'chef-hat',
  [OBJECT_TYPES.SERVICE_OFFERED]: 'hand-helping',
  [OBJECT_TYPES.SERVICE_REQUESTED]: 'hand',
  [OBJECT_TYPES.SKILL]: 'sparkles',
};

export function iconForDiscoverObjectType(type: string): IconName {
  if (Object.hasOwn(DISCOVER_TYPE_ICONS, type)) {
    return DISCOVER_TYPE_ICONS[type as ObjectType];
  }
  return 'layout-grid';
}
