import { UPDATE_TYPES } from './update-types';
import { UPDATE_REGISTRY } from './update-registry';

/**
 * UI-only edit-mode field group ids for object left rail and future create flows.
 * Not used by the indexer — presentation catalog only.
 */
export const EDIT_FIELD_GROUP_IDS = [
  'header',
  'publication',
  'details',
  'community',
  'gallery',
  'visit',
  'commerce',
  'recipe',
  'contact',
  'payments',
  'content',
  'catalog',
  'map',
  'group',
  'affiliate',
  'service',
  'governance',
  'skill',
  'object',
] as const;

export type EditFieldGroupId = (typeof EDIT_FIELD_GROUP_IDS)[number];

/** Stable group order; empty groups are omitted at render time. */
export const EDIT_FIELD_GROUP_ORDER: readonly EditFieldGroupId[] = EDIT_FIELD_GROUP_IDS;

/** Object types that show `price` under visit instead of commerce. */
export const VISIT_PRICE_OBJECT_TYPES = ['restaurant', 'place', 'business'] as const;

export type VisitPriceObjectType = (typeof VISIT_PRICE_OBJECT_TYPES)[number];

export function isVisitPriceObjectType(objectType: string): boolean {
  return (VISIT_PRICE_OBJECT_TYPES as readonly string[]).includes(objectType.trim());
}

/**
 * Within-group update_type order. `price` lives in commerce by default;
 * venue types override via {@link resolveEditGroup}.
 */
export const EDIT_GROUP_FIELD_ORDER: Readonly<Record<EditFieldGroupId, readonly string[]>> = {
  header: [
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.IMAGE,
    UPDATE_TYPES.IMAGE_BACKGROUND,
  ],
  publication: [
    UPDATE_TYPES.AUTHOR,
    UPDATE_TYPES.PUBLISHER,
    UPDATE_TYPES.DATE_PUBLISHED,
    UPDATE_TYPES.IN_LANGUAGE,
    UPDATE_TYPES.PRINT_LENGTH,
    UPDATE_TYPES.TYPICAL_AGE_RANGE,
  ],
  details: [
    UPDATE_TYPES.PARENT,
    UPDATE_TYPES.MENU_ITEM,
    UPDATE_TYPES.BUTTON,
    UPDATE_TYPES.DESCRIPTION,
  ],
  community: [
    UPDATE_TYPES.AGGREGATE_RATING,
    UPDATE_TYPES.TAG_CATEGORY,
    UPDATE_TYPES.TAG_CATEGORY_ITEM,
    UPDATE_TYPES.CATEGORY,
  ],
  gallery: [UPDATE_TYPES.IMAGE_GALLERY, UPDATE_TYPES.IMAGE_GALLERY_ITEM],
  visit: [UPDATE_TYPES.WORK_HOURS, UPDATE_TYPES.ADDRESS, UPDATE_TYPES.GEO],
  commerce: [
    UPDATE_TYPES.COMPARE_AT_PRICE,
    UPDATE_TYPES.PRICE,
    UPDATE_TYPES.SALE_EVENT,
    UPDATE_TYPES.OPTION,
    UPDATE_TYPES.BUDGET,
    UPDATE_TYPES.PRODUCT_WEIGHT,
    UPDATE_TYPES.SIZE,
    UPDATE_TYPES.MERCHANT,
    UPDATE_TYPES.BRAND,
    UPDATE_TYPES.MANUFACTURER,
    UPDATE_TYPES.FEATURE_LIST,
    UPDATE_TYPES.ADD_ON,
    UPDATE_TYPES.IS_RELATED_TO,
    UPDATE_TYPES.IS_SIMILAR_TO,
    UPDATE_TYPES.SHOP_FILTER,
  ],
  recipe: [
    UPDATE_TYPES.COOK_TIME,
    UPDATE_TYPES.CALORIES,
    UPDATE_TYPES.NUTRITION,
    UPDATE_TYPES.INGREDIENTS,
  ],
  contact: [
    UPDATE_TYPES.WEBSITE,
    UPDATE_TYPES.LINK,
    UPDATE_TYPES.TELEPHONE,
    UPDATE_TYPES.EMAIL,
  ],
  payments: [UPDATE_TYPES.WALLET_ADDRESS],
  content: [
    UPDATE_TYPES.URL,
    UPDATE_TYPES.PAGE_CONTENT,
    UPDATE_TYPES.HTML_CONTENT,
    UPDATE_TYPES.CONTENT_VIEW,
    UPDATE_TYPES.CONTENT_POSITION,
    UPDATE_TYPES.WIDGET,
    UPDATE_TYPES.FORM,
    UPDATE_TYPES.NEWS_FEED,
    UPDATE_TYPES.NEWS_FILTER,
    UPDATE_TYPES.LEGAL_TEXT,
    UPDATE_TYPES.SKILL_CONTENT,
  ],
  skill: [
    UPDATE_TYPES.LICENSE,
    UPDATE_TYPES.COMPATIBILITY,
    UPDATE_TYPES.METADATA,
    UPDATE_TYPES.ALLOWED_TOOLS,
    UPDATE_TYPES.REFERENCES,
  ],
  catalog: [
    UPDATE_TYPES.SORT_CUSTOM,
    UPDATE_TYPES.LIST_ITEM,
    UPDATE_TYPES.FEATURED,
    UPDATE_TYPES.PROMOTION,
    UPDATE_TYPES.PIN,
    UPDATE_TYPES.REMOVE,
  ],
  map: [
    UPDATE_TYPES.MAP_DESKTOP_VIEW,
    UPDATE_TYPES.MAP_MOBILE_VIEW,
    UPDATE_TYPES.MAP_OBJECT_TYPES,
    UPDATE_TYPES.MAP_OBJECT_TAGS,
    UPDATE_TYPES.MAP_OBJECTS_LIST,
    UPDATE_TYPES.MAP_RECTANGLES,
  ],
  group: [
    UPDATE_TYPES.GROUP_EXPERTISE,
    UPDATE_TYPES.GROUP_MIN_EXPERTISE,
    UPDATE_TYPES.GROUP_FOLLOWERS,
    UPDATE_TYPES.GROUP_FOLLOWING,
    UPDATE_TYPES.GROUP_ADD,
    UPDATE_TYPES.GROUP_EXCLUDE,
    UPDATE_TYPES.GROUP_LAST_ACTIVITY,
  ],
  affiliate: [
    UPDATE_TYPES.AFFILIATE_BUTTON,
    UPDATE_TYPES.AFFILIATE_CODE,
    UPDATE_TYPES.AFFILIATE_URL_TEMPLATE,
    UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES,
    UPDATE_TYPES.AFFILIATE_GEO_AREA,
  ],
  service: [
    UPDATE_TYPES.CAPABILITY,
    UPDATE_TYPES.ENDPOINT,
    UPDATE_TYPES.PRICE_MODEL,
    UPDATE_TYPES.CURRENCY,
    UPDATE_TYPES.SLA,
  ],
  governance: [
    UPDATE_TYPES.OBJECT_CONTROL,
    UPDATE_TYPES.ADMINS,
    UPDATE_TYPES.MODERATORS,
    UPDATE_TYPES.TRUSTED,
    UPDATE_TYPES.AUTHORITIES,
    UPDATE_TYPES.WHITELIST,
    UPDATE_TYPES.RESTRICTED,
    UPDATE_TYPES.BANNED,
    UPDATE_TYPES.INHERITS_FROM,
    UPDATE_TYPES.VALIDITY_CUTOFF,
  ],
  object: [
    UPDATE_TYPES.IDENTIFIER,
    UPDATE_TYPES.PRODUCT_GROUP_ID,
    UPDATE_TYPES.STATUS,
    UPDATE_TYPES.DELEGATION,
  ],
};

function buildUpdateTypeToEditGroup(): Readonly<Record<string, EditFieldGroupId>> {
  const map: Record<string, EditFieldGroupId> = {};
  for (const groupId of EDIT_FIELD_GROUP_ORDER) {
    for (const updateType of EDIT_GROUP_FIELD_ORDER[groupId]) {
      map[updateType] = groupId;
    }
  }
  return map;
}

/** Default group for each update_type (venue `price` overlay applied in {@link resolveEditGroup}). */
export const UPDATE_TYPE_TO_EDIT_GROUP: Readonly<Record<string, EditFieldGroupId>> =
  buildUpdateTypeToEditGroup();

/** Full catalog update_type order (all groups, all fields). */
export const EDIT_MODE_UPDATE_TYPE_ORDER: readonly string[] = EDIT_FIELD_GROUP_ORDER.flatMap(
  (groupId) => [...EDIT_GROUP_FIELD_ORDER[groupId]],
);

/**
 * Resolves the edit group for an update_type, applying object-type overlays.
 */
export function resolveEditGroup(
  updateType: string,
  objectType = '',
): EditFieldGroupId | undefined {
  if (
    updateType === UPDATE_TYPES.PRICE &&
    isVisitPriceObjectType(objectType)
  ) {
    return 'visit';
  }
  return UPDATE_TYPE_TO_EDIT_GROUP[updateType];
}

/**
 * Ordered update_types for edit mode, optionally filtered to supported types.
 * Venue types insert `price` first in the visit group when supported.
 */
export function resolveEditModeUpdateTypes(
  objectType = '',
  supportedUpdateTypes?: readonly string[],
): readonly string[] {
  const supported =
    supportedUpdateTypes != null ? new Set(supportedUpdateTypes) : null;

  const ordered: string[] = [];

  for (const groupId of EDIT_FIELD_GROUP_ORDER) {
    const fields = [...EDIT_GROUP_FIELD_ORDER[groupId]];

    if (groupId === 'visit' && isVisitPriceObjectType(objectType)) {
      const withoutPrice = fields.filter((t) => t !== UPDATE_TYPES.PRICE);
      if (supported == null || supported.has(UPDATE_TYPES.PRICE)) {
        ordered.push(UPDATE_TYPES.PRICE);
      }
      for (const updateType of withoutPrice) {
        if (supported == null || supported.has(updateType)) {
          ordered.push(updateType);
        }
      }
      continue;
    }

    if (groupId === 'commerce' && isVisitPriceObjectType(objectType)) {
      for (const updateType of fields) {
        if (updateType === UPDATE_TYPES.PRICE) {
          continue;
        }
        if (supported == null || supported.has(updateType)) {
          ordered.push(updateType);
        }
      }
      continue;
    }

    for (const updateType of fields) {
      if (supported == null || supported.has(updateType)) {
        ordered.push(updateType);
      }
    }
  }

  return ordered;
}

/** i18n key suffix for each group (`object_edit_group_<id>`). */
export const EDIT_FIELD_GROUP_I18N_KEY: Readonly<Record<EditFieldGroupId, string>> = {
  header: 'object_edit_group_header',
  publication: 'object_edit_group_publication',
  details: 'object_edit_group_details',
  community: 'object_edit_group_community',
  gallery: 'object_edit_group_gallery',
  visit: 'object_edit_group_visit',
  commerce: 'object_edit_group_commerce',
  recipe: 'object_edit_group_recipe',
  contact: 'object_edit_group_contact',
  payments: 'object_edit_group_payments',
  content: 'object_edit_group_content',
  catalog: 'object_edit_group_catalog',
  map: 'object_edit_group_map',
  group: 'object_edit_group_group',
  affiliate: 'object_edit_group_affiliate',
  service: 'object_edit_group_service',
  governance: 'object_edit_group_governance',
  skill: 'object_edit_group_skill',
  object: 'object_edit_group_object',
};

/** Ensures catalog completeness at module load (dev/test guard). */
export function assertEditFieldGroupCatalogComplete(): void {
  const registryKeys = Object.keys(UPDATE_REGISTRY);
  const catalogKeys = Object.keys(UPDATE_TYPE_TO_EDIT_GROUP);

  const missing = registryKeys.filter((k) => !catalogKeys.includes(k));
  const extra = catalogKeys.filter((k) => !registryKeys.includes(k));

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Edit field group catalog mismatch. Missing: [${missing.join(', ')}]. Extra: [${extra.join(', ')}].`,
    );
  }
}

assertEditFieldGroupCatalogComplete();
