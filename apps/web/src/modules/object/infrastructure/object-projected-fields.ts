import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';

import { isOptionsObjectType } from '../domain/object-left-rail-order';
import { resolveSocialLinkHref } from '../domain/resolve-social-link-href';

import type {
  ProjectedGalleryAlbumView,
  ProjectedGalleryPhotoView,
  ProjectedWidgetConfigView,
} from '../domain/object-page.types';
import type { ProjectedMenuItem, ProjectedMenuItemObject } from '../domain/projected-menu-item.types';
import type {
  CatalogListSortType,
  ProjectedListItem,
  ProjectedListItemRatingAspect,
  ProjectedListItemRef,
  ProjectedSortCustom,
} from '../domain/projected-list-item.types';

export type { ProjectedGalleryAlbumView, ProjectedGalleryPhotoView } from '../domain/object-page.types';
export type { ProjectedMenuItem } from '../domain/projected-menu-item.types';
export type {
  CatalogListSortType,
  ProjectedListItem,
  ProjectedSortCustom,
} from '../domain/projected-list-item.types';

/** Structured address (`address` update). */
export type ProjectedAddress = {
  street: string;
  locality: string;
  postal_code: string;
  country: string;
  state?: string;
  suite?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function readString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

function trimString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function nameFromMenuItemEmbeddedObject(row: Record<string, unknown>): string | undefined {
  const embedded = row['object'];
  if (!isRecord(embedded)) {
    return undefined;
  }
  const fields = embedded['fields'];
  if (!isRecord(fields)) {
    return undefined;
  }
  return readString(fields['name']);
}

function embeddedMenuTarget(row: Record<string, unknown>): ProjectedMenuItemObject | undefined {
  const embedded = row['object'];
  if (!isRecord(embedded)) {
    return undefined;
  }
  const object_id = embedded['object_id'];
  const object_type = embedded['object_type'];
  const fieldsRaw = embedded['fields'];
  if (typeof object_id !== 'string' || object_id.trim().length === 0) {
    return undefined;
  }
  if (typeof object_type !== 'string' || object_type.trim().length === 0) {
    return undefined;
  }
  const fields = isRecord(fieldsRaw) ? fieldsRaw : {};
  return {
    object_id: object_id.trim(),
    object_type: object_type.trim(),
    fields,
  };
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (t.length === 0) {
      return null;
    }
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Latitude/longitude from `geo` projection
 * (@see apps/query-api/src/domain/object-projection/project-field.ts).
 *
 * Accepts `{ latitude, longitude }` as numbers or numeric strings (JSON drift),
 * and GeoJSON Point `{ type, coordinates: [lng, lat] }` if it ever bypasses projection.
 */
export function projectedGeoLatLon(
  o: ProjectedObjectView,
): { latitude: number; longitude: number } | null {
  const raw = o.fields.geo;
  if (!isRecord(raw)) {
    return null;
  }

  let lat = toFiniteNumber(raw.latitude);
  let lng = toFiniteNumber(raw.longitude);
  if (lat != null && lng != null && isValidLatLng(lat, lng)) {
    return { latitude: lat, longitude: lng };
  }

  if (raw.type === 'Point' && Array.isArray(raw.coordinates)) {
    lng = toFiniteNumber(raw.coordinates[0]);
    lat = toFiniteNumber(raw.coordinates[1]);
    if (lat != null && lng != null && isValidLatLng(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

/** Migration / schema placeholders — omit from left-rail display. */
const ADDRESS_DISPLAY_PLACEHOLDER_LOCALITY = 'unknown';
const ADDRESS_DISPLAY_PLACEHOLDER_POSTAL = '0';

function isAddressDisplayPlaceholderLocality(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === ADDRESS_DISPLAY_PLACEHOLDER_LOCALITY;
}

function isAddressDisplayPlaceholderPostal(value: string | undefined): boolean {
  return value?.trim() === ADDRESS_DISPLAY_PLACEHOLDER_POSTAL;
}

/** Builds one display line from structured address fields. */
export function formatProjectedAddress(a: ProjectedAddress): string {
  const locality = isAddressDisplayPlaceholderLocality(a.locality)
    ? undefined
    : a.locality;
  const postalCode = isAddressDisplayPlaceholderPostal(a.postal_code)
    ? undefined
    : a.postal_code;
  const country = isAddressDisplayPlaceholderLocality(a.country)
    ? undefined
    : a.country;
  const parts = [
    a.suite ? `${a.suite}, ${a.street}` : a.street,
    [locality, a.state].filter(Boolean).join(', '),
    [postalCode, country].filter(Boolean).join(' '),
  ].filter((p) => p.length > 0);
  return parts.join('\n');
}

export function projectedStructuredAddress(o: ProjectedObjectView): ProjectedAddress | null {
  const raw = o.fields.address;
  if (!isRecord(raw)) {
    return null;
  }
  const street = readString(raw.street);
  const locality = readString(raw.locality);
  const postal_code = readString(raw.postal_code);
  const country = readString(raw.country);
  if (!street || !locality || !postal_code || !country) {
    return null;
  }
  return {
    street,
    locality,
    postal_code,
    country,
    state: readString(raw.state),
    suite: readString(raw.suite),
  };
}

export function projectedAddressDisplayLine(o: ProjectedObjectView): string | null {
  const s = projectedStructuredAddress(o);
  return s ? formatProjectedAddress(s) : null;
}

/**
 * Parent chain link from projected {@link libs/core/src/update-registry/updates/parent.ts}
 * (`object_ref`), or same payload hoisted to the resolved object root.
 */
export type ProjectedParentRow = {
  objectId: string;
  name: string;
  imageUrl: string | null;
};

function parentPayloadRecord(o: ProjectedObjectView): Record<string, unknown> | null {
  const elevated = (o as unknown as Record<string, unknown>)['parent'];
  if (isRecord(elevated)) {
    return elevated;
  }
  const f = o.fields['parent'];
  return isRecord(f) ? f : null;
}

export function projectedParentRow(o: ProjectedObjectView): ProjectedParentRow | null {
  const raw = parentPayloadRecord(o);
  if (!raw) {
    return null;
  }
  const objectIdRaw = typeof raw.object_id === 'string' ? raw.object_id.trim() : '';
  if (!objectIdRaw.length) {
    return null;
  }
  let imageUrl: string | null = null;
  let nameFromFields = '';
  const nested = raw.fields;
  if (isRecord(nested)) {
    nameFromFields = readString(nested.name) ?? '';
    const img = nested.image;
    if (typeof img === 'string' && img.trim().length > 0) {
      imageUrl = img.trim();
    }
  }
  const name = nameFromFields.length > 0 ? nameFromFields : objectIdRaw;
  return {
    objectId: objectIdRaw,
    name,
    imageUrl,
  };
}

function refSummaryTagCategoryLabels(fields: Record<string, unknown>): string[] {
  const raw = fields['tagCategoryItem'];
  if (!Array.isArray(raw)) {
    return [];
  }
  const labels: string[] = [];
  for (const item of raw) {
    if (item != null && typeof item === 'object' && !Array.isArray(item) && 'value' in item) {
      const v = (item as { value?: unknown }).value;
      if (typeof v === 'string' && v.length > 0) {
        labels.push(v);
      }
    }
  }
  return labels.slice(-2);
}

function refSummaryAggregateRatingAspects(
  fields: Record<string, unknown>,
): ProjectedListItemRatingAspect[] {
  const raw = fields['aggregateRating'];
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ProjectedListItemRatingAspect[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const o = item as Record<string, unknown>;
    const dimensionRaw = o.dimension;
    if (typeof dimensionRaw !== 'string') {
      continue;
    }
    const dimension = dimensionRaw.trim();
    if (dimension.length === 0) {
      continue;
    }
    const averageRating =
      typeof o.averageRating === 'number' && Number.isFinite(o.averageRating)
        ? o.averageRating
        : null;
    const userRating =
      typeof o.userRating === 'number' && Number.isFinite(o.userRating) ? o.userRating : null;
    const tv = o.totalVoters;
    const totalVoters =
      typeof tv === 'number' && Number.isFinite(tv) && tv >= 0 ? Math.floor(tv) : 0;
    const updateIdRaw = o.update_id;
    const update_id =
      typeof updateIdRaw === 'string' && updateIdRaw.trim().length > 0
        ? updateIdRaw.trim()
        : null;
    out.push({ update_id, dimension, averageRating, userRating, totalVoters });
  }
  return out;
}

function refSummaryRefPayload(raw: unknown): ProjectedListItemRef | null {
  if (!isRecord(raw)) {
    return null;
  }
  const objectId = readString(raw['object_id']);
  const objectType = readString(raw['object_type']);
  if (!objectId || !objectType) {
    return null;
  }
  const nested = raw['fields'];
  let name = '';
  let imageUrl: string | null = null;
  if (isRecord(nested)) {
    name = readString(nested['name']) ?? '';
    imageUrl =
      typeof nested['image'] === 'string' ? readString(nested['image']) ?? null : null;
  }
  return {
    objectId,
    objectType,
    name: name.length > 0 ? name : objectId,
    imageUrl,
  };
}

function refSummaryFirstRefPayload(raw: unknown): ProjectedListItemRef | null {
  if (Array.isArray(raw)) {
    for (const row of raw) {
      const parsed = refSummaryRefPayload(row);
      if (parsed) {
        return parsed;
      }
    }
    return null;
  }
  return refSummaryRefPayload(raw);
}

function refSummaryToListItem(row: Record<string, unknown>): ProjectedListItem | null {
  const object_id = readString(row['object_id']);
  const object_type = readString(row['object_type']);
  if (!object_id || !object_type) {
    return null;
  }
  const fields = row['fields'];
  const nameFromFields =
    isRecord(fields) ? readString(fields['name']) : undefined;
  const imageFromFields =
    isRecord(fields) && typeof fields['image'] === 'string'
      ? readString(fields['image'])
      : undefined;
  const descriptionFromFields =
    isRecord(fields) ? readString(fields['description']) : undefined;
  const titleFromFields =
    isRecord(fields) ? readString(fields['title']) : undefined;
  const addressFromFields =
    isRecord(fields) && fields['address'] != null ? fields['address'] : undefined;
  const geoFromFields =
    isRecord(fields) && fields['geo'] != null ? fields['geo'] : undefined;
  const priceFromFields = isRecord(fields) ? readString(fields['price']) : undefined;
  const brandRef = isRecord(fields) ? refSummaryFirstRefPayload(fields['brand']) : null;
  const parentRef = isRecord(fields) ? refSummaryRefPayload(fields['parent']) : null;
  const tagCategoryLabels = isRecord(fields) ? refSummaryTagCategoryLabels(fields) : [];
  const aggregateRatingAspects = isRecord(fields)
    ? refSummaryAggregateRatingAspects(fields)
    : [];
  const isFavorited =
    row['isFavorited'] === true || row['hasAdministrativeAuthority'] === true;
  const rawCount = row['listItemsCount'];
  const listItemsCount =
    typeof rawCount === 'number' && Number.isFinite(rawCount) ? rawCount : undefined;
  const weight = toFiniteNumber(row['weight']);
  const addedAtUnix = toFiniteNumber(row['addedAtUnix']);
  const listItemUpdateId = readString(row['update_id']) ?? undefined;
  return {
    objectId: object_id,
    objectType: object_type,
    name: nameFromFields ?? object_id,
    imageUrl: imageFromFields ?? null,
    weight,
    ...(addedAtUnix !== null ? { addedAtUnix } : {}),
    ...(listItemUpdateId ? { listItemUpdateId } : {}),
    ...(listItemsCount !== undefined ? { listItemsCount } : {}),
    ...(titleFromFields ? { title: titleFromFields } : {}),
    ...(addressFromFields !== undefined ? { address: addressFromFields } : {}),
    ...(geoFromFields !== undefined ? { geo: geoFromFields } : {}),
    ...(descriptionFromFields ? { description: descriptionFromFields } : {}),
    ...(priceFromFields ? { price: priceFromFields } : {}),
    ...(brandRef ? { brandRef } : {}),
    ...(parentRef ? { parentRef } : {}),
    ...(tagCategoryLabels.length > 0 ? { tagCategoryLabels } : {}),
    ...(aggregateRatingAspects.length > 0 ? { aggregateRatingAspects } : {}),
    ...(isFavorited ? { isFavorited: true } : {}),
  };
}

export function projectedListItems(o: ProjectedObjectView): ProjectedListItem[] {
  const raw = o.fields.listItem;
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<string>();
  const out: ProjectedListItem[] = [];
  for (const row of raw) {
    if (!isRecord(row)) {
      continue;
    }
    const item = refSummaryToListItem(row);
    if (item && !seen.has(item.objectId)) {
      seen.add(item.objectId);
      out.push(item);
    }
  }
  return out;
}

function listItemMatchesKey(item: ProjectedListItem, key: string): boolean {
  if (item.objectId === key || item.name === key) {
    return true;
  }
  return false;
}

function listItemExcluded(item: ProjectedListItem, exclude: string[]): boolean {
  return exclude.some((k) => listItemMatchesKey(item, k));
}

const CATALOG_LIST_SORT_TYPES = new Set<CatalogListSortType>([
  'rank',
  'by-name-asc',
  'by-name-desc',
  'recency',
  'reverse_recency',
]);

/** Legacy `CatalogWrap.defaultSortBy` — custom when include is set, else explicit sortType or rank. */
export function resolveListItemCatalogSortType(
  sort: ProjectedSortCustom | null,
): CatalogListSortType | 'custom' {
  if (sort?.sortType === 'custom' && sort.include.length > 0) {
    return 'custom';
  }
  if (sort?.sortType && CATALOG_LIST_SORT_TYPES.has(sort.sortType as CatalogListSortType)) {
    return sort.sortType as CatalogListSortType;
  }
  if (sort && sort.include.length > 0) {
    return 'custom';
  }
  return 'rank';
}

function compareListItemsByRank(a: ProjectedListItem, b: ProjectedListItem): number {
  const aw = a.weight ?? 0;
  const bw = b.weight ?? 0;
  if (bw !== aw) {
    return bw - aw;
  }
  return a.name.localeCompare(b.name);
}

function compareListItemsByNameAsc(a: ProjectedListItem, b: ProjectedListItem): number {
  return a.name.localeCompare(b.name);
}

function compareListItemsByNameDesc(a: ProjectedListItem, b: ProjectedListItem): number {
  return b.name.localeCompare(a.name);
}

function compareListItemsByAddedAtAsc(a: ProjectedListItem, b: ProjectedListItem): number {
  const aw = a.addedAtUnix ?? 0;
  const bw = b.addedAtUnix ?? 0;
  if (aw !== bw) {
    return aw - bw;
  }
  return a.name.localeCompare(b.name);
}

function compareListItemsByAddedAtDesc(a: ProjectedListItem, b: ProjectedListItem): number {
  const aw = a.addedAtUnix ?? 0;
  const bw = b.addedAtUnix ?? 0;
  if (bw !== aw) {
    return bw - aw;
  }
  return a.name.localeCompare(b.name);
}

export function sortListItemsByCatalogType(
  items: ProjectedListItem[],
  sortType: CatalogListSortType,
): ProjectedListItem[] {
  const copy = [...items];
  switch (sortType) {
    case 'rank':
      copy.sort(compareListItemsByRank);
      break;
    case 'by-name-asc':
      copy.sort(compareListItemsByNameAsc);
      break;
    case 'by-name-desc':
      copy.sort(compareListItemsByNameDesc);
      break;
    case 'recency':
      copy.sort(compareListItemsByAddedAtAsc);
      break;
    case 'reverse_recency':
      copy.sort(compareListItemsByAddedAtDesc);
      break;
    default: {
      const _exhaustive: never = sortType;
      return _exhaustive;
    }
  }
  return copy;
}

function dedupeListItemsByObjectId(items: ProjectedListItem[]): ProjectedListItem[] {
  const seen = new Set<string>();
  const out: ProjectedListItem[] = [];
  for (const item of items) {
    if (seen.has(item.objectId)) {
      continue;
    }
    seen.add(item.objectId);
    out.push(item);
  }
  return out;
}

function applySortCustomIncludeOrder(
  items: ProjectedListItem[],
  sort: ProjectedSortCustom,
): ProjectedListItem[] {
  const picked: ProjectedListItem[] = [];
  const usedIds = new Set<string>();
  for (const key of sort.include) {
    const found = items.find(
      (item) => !usedIds.has(item.objectId) && listItemMatchesKey(item, key),
    );
    if (found) {
      picked.push(found);
      usedIds.add(found.objectId);
    }
  }
  for (const item of items) {
    if (!usedIds.has(item.objectId)) {
      picked.push(item);
      usedIds.add(item.objectId);
    }
  }
  return picked;
}

/** Legacy Waivio: list-type children always render before other object types. */
export function sortListItemsListsFirst(items: ProjectedListItem[]): ProjectedListItem[] {
  const lists: ProjectedListItem[] = [];
  const nonLists: ProjectedListItem[] = [];
  for (const item of items) {
    if (item.objectType === 'list') {
      lists.push(item);
    } else {
      nonLists.push(item);
    }
  }
  return [...lists, ...nonLists];
}

/**
 * Legacy catalog ordering: `sortCustom` include/exclude, else default `rank` (weight desc).
 * List-type items are always moved to the front (`sortListItemsListsFirst`).
 */
export function applySortCustomToListItems(
  items: ProjectedListItem[],
  sort: ProjectedSortCustom | null,
): ProjectedListItem[] {
  const unique = dedupeListItemsByObjectId(items);
  const base = sort ? unique.filter((item) => !listItemExcluded(item, sort.exclude)) : unique;
  const sortMode = resolveListItemCatalogSortType(sort);
  const ordered =
    sortMode === 'custom' && sort
      ? applySortCustomIncludeOrder(base, sort)
      : sortListItemsByCatalogType(
          base,
          sortMode === 'custom' ? 'rank' : sortMode,
        );
  return sortListItemsListsFirst(ordered);
}

export function projectedPageContent(o: ProjectedObjectView): string | null {
  const raw = o.fields.pageContent;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return null;
}

export function projectedLegalText(o: ProjectedObjectView): string | null {
  const raw = o.fields.legalText;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return null;
}

/** Sanitized HTML body for page-type objects, legal documents, and skills. */
export function projectedHostHtmlBody(o: ProjectedObjectView): string | null {
  return projectedPageContent(o) ?? projectedLegalText(o) ?? projectedSkillContent(o);
}

export function projectedSkillContent(o: ProjectedObjectView): string | null {
  const raw = o.fields.skillContent;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return null;
}

export function projectedLicense(o: ProjectedObjectView): string | null {
  return readString(o.fields.license) ?? null;
}

export function projectedCompatibility(o: ProjectedObjectView): string | null {
  return readString(o.fields.compatibility) ?? null;
}

/** Metadata rows folded to `{ key, value }[]` for left-rail display. */
export function projectedMetadataItems(o: ProjectedObjectView): ProjectedFeatureListItem[] {
  const raw = o.fields.metadata;
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return [];
  }
  const record = raw as Record<string, unknown>;
  return Object.entries(record)
    .map(([key, value]) => ({
      key: key.trim(),
      value: typeof value === 'string' ? value.trim() : String(value ?? ''),
    }))
    .filter((row) => row.key.length > 0 && row.value.length > 0);
}

/** Allowed tool names from projected `allowedTools`. */
export function projectedAllowedTools(o: ProjectedObjectView): string[] {
  const raw = o.fields.allowedTools;
  if (!Array.isArray(raw)) {
    return typeof raw === 'string' && raw.trim().length > 0 ? [raw.trim()] : [];
  }
  return raw
    .filter((v): v is string => typeof v === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseWidgetConfigRecord(raw: unknown): ProjectedWidgetConfigView | null {
  if (!isPlainRecord(raw)) {
    return null;
  }
  const column = typeof raw.column === 'string' ? raw.column.trim() : '';
  const type = typeof raw.type === 'string' ? raw.type.trim() : '';
  const content = typeof raw.content === 'string' ? raw.content.trim() : '';
  if (!column || !type || !content) {
    return null;
  }
  const title = typeof raw.title === 'string' && raw.title.trim().length > 0
    ? raw.title.trim()
    : undefined;
  return { column, type, content, ...(title ? { title } : {}) };
}

/**
 * Parses the `widget` update field into embed config.
 * Handles plain object, multi-cardinality array (first valid entry), and legacy stringified JSON.
 */
export function projectedWidgetConfig(o: ProjectedObjectView): ProjectedWidgetConfigView | null {
  const raw = o.fields.widget;
  if (raw == null) {
    return null;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          const config = parseWidgetConfigRecord(entry);
          if (config) {
            return config;
          }
        }
        return null;
      }
      return parseWidgetConfigRecord(parsed);
    } catch {
      return null;
    }
  }

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const config = parseWidgetConfigRecord(entry);
      if (config) {
        return config;
      }
    }
    return null;
  }

  return parseWidgetConfigRecord(raw);
}

export function projectedDescriptionContent(o: ProjectedObjectView): string | null {
  const raw = o.fields.description;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return null;
}

/**
 * Legacy Waivio business menus are often stored as `listItem` refs (menuList/menuPage)
 * ordered by `sortCustom`, not as `menuItem` JSON updates.
 */
export function projectedMenuItemsFromListItems(
  listItems: ProjectedListItem[],
): ProjectedMenuItem[] {
  const out: ProjectedMenuItem[] = [];
  for (const item of listItems) {
    out.push({
      displayTitle: item.name,
      style: 'standard',
      link_to_object: item.objectId,
      object_type: item.objectType,
      ...(item.imageUrl ? { image: item.imageUrl } : {}),
      object: {
        object_id: item.objectId,
        object_type: item.objectType,
        fields: {
          name: item.name,
          ...(item.imageUrl ? { image: item.imageUrl } : {}),
        },
      },
    });
  }
  return out;
}

export function resolveMenuItemsForView(
  viewLike: ProjectedObjectView,
): ProjectedMenuItem[] {
  const sortCustom = projectedSortCustom(viewLike);
  const fromMenuItem = applySortCustomToMenuItems(
    projectedMenuItems(viewLike),
    sortCustom,
  );
  if (fromMenuItem.length > 0) {
    return fromMenuItem;
  }
  if (viewLike.object_type === 'list') {
    return [];
  }
  const listOrdered = applySortCustomToListItems(
    projectedListItems(viewLike),
    sortCustom,
  );
  return projectedMenuItemsFromListItems(listOrdered);
}

function menuItemLinkKey(item: ProjectedMenuItem): string | null {
  const objectLink = item.link_to_object?.trim();
  if (objectLink) {
    return `object:${objectLink}`;
  }
  const webLink = item.link_to_web?.trim();
  if (webLink) {
    return `web:${webLink}`;
  }
  return null;
}

export function projectedMenuItems(o: ProjectedObjectView): ProjectedMenuItem[] {
  const raw = o.fields.menuItem;
  if (!Array.isArray(raw)) {
    return [];
  }
  const seenLinks = new Set<string>();
  const out: ProjectedMenuItem[] = [];
  for (const row of raw) {
    if (!isRecord(row)) {
      continue;
    }
    const style = readString(row.style);
    if (!style) {
      continue;
    }

    const link_to_object = readString(row.link_to_object);
    const link_to_web = readString(row.link_to_web);
    if (!link_to_object && !link_to_web) {
      continue;
    }

    const titleTrimmed = trimString(row.title);
    if (link_to_web && !link_to_object && titleTrimmed.length === 0) {
      continue;
    }

    const nameFromObject = nameFromMenuItemEmbeddedObject(row);
    const displayTitleRaw =
      titleTrimmed || nameFromObject || link_to_object || link_to_web || '';
    const displayTitle = displayTitleRaw.trim();
    if (displayTitle.length === 0) {
      continue;
    }

    const image = readString(row.image);
    const object_type = readString(row.object_type);
    const embedded = embeddedMenuTarget(row);

    const linkKey = menuItemLinkKey({
      displayTitle,
      style,
      ...(link_to_object ? { link_to_object } : {}),
      ...(link_to_web ? { link_to_web } : {}),
    });
    if (linkKey && seenLinks.has(linkKey)) {
      continue;
    }
    if (linkKey) {
      seenLinks.add(linkKey);
    }

    out.push({
      displayTitle,
      style,
      ...(titleTrimmed.length > 0 ? { title: titleTrimmed } : {}),
      ...(image ? { image } : {}),
      ...(link_to_object ? { link_to_object } : {}),
      ...(link_to_web ? { link_to_web } : {}),
      ...(object_type ? { object_type } : {}),
      ...(embedded ? { object: embedded } : {}),
    });
  }
  return out;
}

export function projectedSortCustom(o: ProjectedObjectView): ProjectedSortCustom | null {
  const raw = o.fields.sortCustom;
  if (!isRecord(raw)) {
    return null;
  }
  const include = raw.include;
  const exclude = raw.exclude;
  const inc = Array.isArray(include)
    ? include.filter((x): x is string => typeof x === 'string' && x.length > 0)
    : [];
  const exc = Array.isArray(exclude)
    ? exclude.filter((x): x is string => typeof x === 'string' && x.length > 0)
    : [];
  const sortTypeRaw = readString(raw.sortType);
  const sortType =
    sortTypeRaw === 'custom' ||
    (sortTypeRaw && CATALOG_LIST_SORT_TYPES.has(sortTypeRaw as CatalogListSortType))
      ? (sortTypeRaw as ProjectedSortCustom['sortType'])
      : undefined;
  return {
    include: inc,
    exclude: exc,
    ...(sortType ? { sortType } : {}),
  };
}

function menuItemMatchesKey(item: ProjectedMenuItem, key: string): boolean {
  if (item.title === key) {
    return true;
  }
  if (item.displayTitle === key) {
    return true;
  }
  if (item.link_to_object === key || item.link_to_web === key) {
    return true;
  }
  return false;
}

function menuItemExcluded(item: ProjectedMenuItem, exclude: string[]): boolean {
  return exclude.some((k) => menuItemMatchesKey(item, k));
}

/**
 * Mirrors legacy `sortCustom.include` / `exclude` behavior for menu rows only (subset).
 */
export function applySortCustomToMenuItems(
  items: ProjectedMenuItem[],
  sort: ProjectedSortCustom | null,
): ProjectedMenuItem[] {
  if (!sort) {
    return items;
  }
  const base = items.filter((item) => !menuItemExcluded(item, sort.exclude));
  if (sort.include.length === 0) {
    return base;
  }
  const picked: ProjectedMenuItem[] = [];
  const usedKeys = new Set<string>();
  for (const key of sort.include) {
    const found = base.find((item) => {
      const linkKey = menuItemLinkKey(item);
      if (linkKey && usedKeys.has(linkKey)) {
        return false;
      }
      return menuItemMatchesKey(item, key);
    });
    if (found) {
      picked.push(found);
      const linkKey = menuItemLinkKey(found);
      if (linkKey) {
        usedKeys.add(linkKey);
      }
    }
  }
  for (const item of base) {
    const linkKey = menuItemLinkKey(item);
    if (linkKey && usedKeys.has(linkKey)) {
      continue;
    }
    if (linkKey) {
      usedKeys.add(linkKey);
    }
    picked.push(item);
  }
  return picked;
}

export type ProjectedObjectRefItem = {
  objectId: string;
  name: string;
  imageUrl: string | null;
};

/**
 * Projects one or more `object_ref` values from a field (single or multi-cardinality).
 * Each ref is expected to be `{ object_id, fields: { name, image? } }`.
 */
export function projectedObjectRefItems(
  o: ProjectedObjectView,
  fieldKey: string,
): ProjectedObjectRefItem[] {
  const raw = o.fields[fieldKey];
  const rows: unknown[] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const out: ProjectedObjectRefItem[] = [];
  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }
    const objectId = readString(row.object_id);
    if (!objectId) {
      continue;
    }
    const fields = isRecord(row.fields) ? row.fields : {};
    const name = readString(fields.name) ?? objectId;
    const imageUrl =
      typeof fields.image === 'string' && fields.image.trim().length > 0
        ? fields.image.trim()
        : null;
    out.push({ objectId, name, imageUrl });
  }
  return out;
}

export function projectedWorkHours(o: ProjectedObjectView): string | null {
  return readString(o.fields.workHours) ?? null;
}

export function projectedPrice(o: ProjectedObjectView): string | null {
  return readString(o.fields.price) ?? null;
}

export function projectedCalories(o: ProjectedObjectView): string | null {
  return readString(o.fields.calories) ?? null;
}

export function projectedBudget(o: ProjectedObjectView): string | null {
  return readString(o.fields.budget) ?? null;
}

export function projectedCookTime(o: ProjectedObjectView): string | null {
  return readString(o.fields.cookTime) ?? null;
}

export function projectedNutrition(o: ProjectedObjectView): string | null {
  return readString(o.fields.nutrition) ?? null;
}

export function projectedIngredients(o: ProjectedObjectView): string[] {
  const raw = o.fields.ingredients;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const item of raw) {
    const text = readString(item);
    if (text) {
      out.push(text);
    }
  }
  return out;
}

/** Hive account names from a projected `user_ref` field (multi or single). */
export function projectedUserRefAccounts(
  o: ProjectedObjectView,
  fieldKey: string,
): string[] {
  const raw = o.fields[fieldKey];
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const item of raw) {
      const text = readString(item);
      if (text) {
        out.push(text);
      }
    }
    return out;
  }
  const single = readString(raw);
  return single ? [single] : [];
}

export function projectedObjectControl(o: ProjectedObjectView): string | null {
  return readString(o.fields.objectControl) ?? null;
}

/** Winning `productGroupId` text from the projected object view. */
export function projectedProductGroupId(o: ProjectedObjectView): string | null {
  return readString(o.fields.productGroupId) ?? null;
}

export type ProjectedInheritsFromEntry = {
  objectId: string;
  scope: string[];
};

export function projectedInheritsFromEntries(
  o: ProjectedObjectView,
): ProjectedInheritsFromEntry[] {
  const raw = o.fields.inheritsFrom;
  const rows: unknown[] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const out: ProjectedInheritsFromEntry[] = [];
  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }
    const objectId = readString(row.object_id);
    if (!objectId) {
      continue;
    }
    const scopeRaw = row.scope;
    const scope: string[] = [];
    if (Array.isArray(scopeRaw)) {
      for (const item of scopeRaw) {
        const text = readString(item);
        if (text) {
          scope.push(text);
        }
      }
    }
    out.push({ objectId, scope });
  }
  return out;
}

export type ProjectedValidityCutoffEntry = {
  account: string;
  timestamp: number;
};

function toFiniteTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function projectedValidityCutoffEntries(
  o: ProjectedObjectView,
): ProjectedValidityCutoffEntry[] {
  const raw = o.fields.validityCutoff;
  const rows: unknown[] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const out: ProjectedValidityCutoffEntry[] = [];
  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }
    const account = readString(row.account);
    const timestamp = toFiniteTimestamp(row.timestamp);
    if (account && timestamp != null) {
      out.push({ account, timestamp });
    }
  }
  return out;
}

/** Recipe left rail: Cuisine and Pros first, then remaining tag categories. */
export function orderRecipeTagCategorySections(
  sections: TagCategorySectionView[],
): TagCategorySectionView[] {
  const priority = ['Cuisine', 'Pros'];
  const byTitle = new Map(sections.map((section) => [section.categoryTitle, section]));
  const ordered: TagCategorySectionView[] = [];
  for (const title of priority) {
    const section = byTitle.get(title);
    if (section) {
      ordered.push(section);
      byTitle.delete(title);
    }
  }
  for (const section of sections) {
    if (byTitle.has(section.categoryTitle)) {
      ordered.push(section);
      byTitle.delete(section.categoryTitle);
    }
  }
  return ordered;
}

/** Website entries from projected `website` (single JSON object today). */
export function projectedWebsiteEntries(
  o: ProjectedObjectView,
): { title: string; link: string }[] {
  const raw = o.fields.website;
  const rows: unknown[] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const out: { title: string; link: string }[] = [];
  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }
    const title = readString(row.title);
    const link = readString(row.link);
    if (title && link) {
      out.push({ title, link });
    }
  }
  return out;
}

export type ProjectedProductWeight = {
  value: number;
  unit: string;
};

const PRODUCT_WEIGHT_UNITS = new Set([
  't',
  'kg',
  'gm',
  'mg',
  'mcg',
  'st',
  'lb',
  'oz',
]);

/** Product weight from projected `productWeight` (`{ value, unit }`). */
export function projectedProductWeight(o: ProjectedObjectView): ProjectedProductWeight | null {
  const raw = o.fields.productWeight;
  const rows: unknown[] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }
    const value = toFiniteNumber(row.value);
    const unit = readString(row.unit);
    if (value == null || value < 0 || !unit || !PRODUCT_WEIGHT_UNITS.has(unit)) {
      continue;
    }
    return { value, unit };
  }
  return null;
}

/** Display label for left rail (`12 st`). */
export function formatProductWeightDisplay(weight: ProjectedProductWeight): string {
  const valueText = Number.isInteger(weight.value)
    ? String(weight.value)
    : String(weight.value);
  return `${valueText} ${weight.unit}`;
}

export type ProjectedProductSize = {
  length: number;
  width: number;
  depth: number;
  unit: string;
};

const DIMENSION_UNITS = new Set([
  'km',
  'm',
  'cm',
  'mm',
  'μm',
  'mi',
  'yd',
  'ft',
  'in',
  'nmi',
]);

/** Physical dimensions from projected `size` (`{ length, width, depth, unit }`). */
export function projectedProductSize(o: ProjectedObjectView): ProjectedProductSize | null {
  const raw = o.fields.size;
  const rows: unknown[] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }
    const length = toFiniteNumber(row.length);
    const width = toFiniteNumber(row.width);
    const depth = toFiniteNumber(row.depth);
    const unit = readString(row.unit);
    if (
      length == null ||
      width == null ||
      depth == null ||
      length < 0 ||
      width < 0 ||
      depth < 0 ||
      !unit ||
      !DIMENSION_UNITS.has(unit)
    ) {
      continue;
    }
    return { length, width, depth, unit };
  }
  return null;
}

function formatDimensionValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

/** Display label for left rail (`11 x 20 x 3 μm`). */
export function formatProductSizeDisplay(size: ProjectedProductSize): string {
  return `${formatDimensionValue(size.length)} x ${formatDimensionValue(size.width)} x ${formatDimensionValue(size.depth)} ${size.unit}`;
}

export type ProjectedButtonItem = {
  title: string;
  href: string;
};

/** CTA buttons from projected `button` (multi JSON `{ title, link }`). */
export function projectedButtonItems(o: ProjectedObjectView): ProjectedButtonItem[] {
  const raw = o.fields.button;
  const rows: unknown[] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const out: ProjectedButtonItem[] = [];
  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }
    const title = readString(row.title);
    const link = readString(row.link);
    if (title && link) {
      out.push({ title, href: link });
    }
  }
  return out;
}

/** Reading age from projected `typicalAgeRange` (book). */
export function projectedTypicalAgeRange(o: ProjectedObjectView): string | null {
  const raw = o.fields.typicalAgeRange;
  if (typeof raw !== 'string') {
    return null;
  }
  const text = raw.trim();
  return text.length > 0 ? text : null;
}

/** Language from projected `inLanguage` (book). */
export function projectedInLanguage(o: ProjectedObjectView): string | null {
  const raw = o.fields.inLanguage;
  if (typeof raw !== 'string') {
    return null;
  }
  const text = raw.trim();
  return text.length > 0 ? text : null;
}

/** Publication date from projected `datePublished` (book). */
export function projectedDatePublished(o: ProjectedObjectView): string | null {
  const raw = o.fields.datePublished;
  if (typeof raw !== 'string') {
    return null;
  }
  const text = raw.trim();
  return text.length > 0 ? text : null;
}

/** Print length (page count) from projected `printLength` (book). */
export function projectedPrintLength(o: ProjectedObjectView): string | null {
  const raw = o.fields.printLength;
  if (typeof raw !== 'string') {
    return null;
  }
  const text = raw.trim();
  return text.length > 0 ? text : null;
}

/** Legacy Waivio `MMMM DD, YYYY` when the value is parseable as a date. */
export function formatDatePublishedDisplay(raw: string, locale = 'en-US'): string {
  const trimmed = raw.trim();
  if (!trimmed.length) {
    return '';
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return trimmed;
  }
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(parsed));
}

export type ProjectedFeatureListItem = {
  key: string;
  value: string;
};

function readFeatureListKey(row: Record<string, unknown>): string | undefined {
  return (
    readString(row.key) ??
    readString(row.name) ??
    readString(row.feature_name) ??
    readString(row.featureName)
  );
}

function readFeatureListValue(row: Record<string, unknown>): string | undefined {
  return (
    readString(row.value) ??
    readString(row.body) ??
    readString(row.feature_value) ??
    readString(row.featureValue)
  );
}

/** Feature rows from projected `featureList` (`{ key, value }[]`). */
export function projectedFeatureListItems(o: ProjectedObjectView): ProjectedFeatureListItem[] {
  const raw = o.fields.featureList;
  const rows: unknown[] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const out: ProjectedFeatureListItem[] = [];
  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }
    const key = readFeatureListKey(row);
    const value = readFeatureListValue(row);
    if (key && value) {
      out.push({ key, value });
    }
  }
  return out;
}

export type ProjectedTelephoneEntry = {
  value: string;
  title?: string;
};

/** Telephone rows (`telephone` update — JSON `{ value, title? }[]` or legacy strings). */
export function projectedTelephoneEntries(o: ProjectedObjectView): ProjectedTelephoneEntry[] {
  const raw = o.fields.telephone;
  const out: ProjectedTelephoneEntry[] = [];

  const pushEntry = (value: string, title?: string) => {
    const v = value.trim();
    if (v.length === 0) {
      return;
    }
    const entry: ProjectedTelephoneEntry = { value: v };
    const t = title?.trim();
    if (t && t.length > 0) {
      entry.title = t;
    }
    out.push(entry);
  };

  if (typeof raw === 'string') {
    pushEntry(raw);
    return out;
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  for (const item of raw) {
    if (typeof item === 'string') {
      pushEntry(item);
      continue;
    }
    if (!isRecord(item)) {
      continue;
    }
    const value = readString(item.value);
    if (!value) {
      continue;
    }
    const title = item.title != null ? readString(item.title) : undefined;
    pushEntry(value, title);
  }
  return out;
}

export function projectedEmail(o: ProjectedObjectView): string | null {
  const raw = o.fields.email;
  return typeof raw === 'string' && raw.includes('@') ? raw.trim() : null;
}

export type ProjectedIdentifierRow = {
  type: string;
  value: string;
};

/** Rows from projected `identifier` update (JSON `{ type, value }[]`). */
export function projectedIdentifierRows(o: ProjectedObjectView): ProjectedIdentifierRow[] {
  const raw = o.fields.identifier;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ProjectedIdentifierRow[] = [];
  for (const row of raw) {
    if (!isRecord(row)) {
      continue;
    }
    const type = readString(row.type);
    const value = readString(row.value);
    if (type && value) {
      out.push({ type, value });
    }
  }
  return out;
}

/**
 * Canonical `link.type` strings — mirror {@link libs/core/src/update-registry/updates/link.ts}.
 * Client bundles: prefer registry subpaths over the core barrel for tree-shaking.
 */
const OBJECT_LINK_KINDS = [
  'facebook',
  'twitter',
  'youtube',
  'tiktok',
  'reddit',
  'linkedin',
  'telegram',
  'whatsapp',
  'pinterest',
  'twitch',
  'snapchat',
  'instagram',
  'github',
  'hive',
] as const;

export type ProjectedObjectLinkKind = (typeof OBJECT_LINK_KINDS)[number];

export function isProjectedLinkKind(type: string): type is ProjectedObjectLinkKind {
  return (OBJECT_LINK_KINDS as readonly string[]).includes(type);
}

/** Public asset for social/channel icon (Waivio-style filenames under `/images/icons/`). */
export function linkKindPublicIconSrc(kind: ProjectedObjectLinkKind): string {
  switch (kind) {
    case 'facebook':
      return '/images/icons/facebook-logo.png';
    case 'twitter':
      return '/images/icons/twitter-x.svg';
    case 'youtube':
      return '/images/icons/social/youtube.svg';
    case 'tiktok':
      return '/images/icons/tiktok.svg';
    case 'reddit':
      return '/images/icons/reddit.png';
    case 'linkedin':
      return '/images/icons/social/linkedin.svg';
    case 'telegram':
      return '/images/icons/telegram.png';
    case 'whatsapp':
      return '/images/icons/whatsapp.png';
    case 'pinterest':
      return '/images/icons/pinterest.png';
    case 'twitch':
      return '/images/icons/twitch.png';
    case 'snapchat':
      return '/images/icons/snapchat.svg';
    case 'instagram':
      return '/images/icons/social/instagram.svg';
    case 'github':
      return '/images/icons/social/github.svg';
    case 'hive':
      return '/images/icons/cryptocurrencies/hive.png';
    default: {
      const _e: never = kind;
      return _e;
    }
  }
}

/** Platform caption as in legacy sidebar (inactive text). */
export function linkKindDisplayLabel(kind: ProjectedObjectLinkKind | string): string {
  switch (kind) {
    case 'facebook':
      return 'Facebook';
    case 'twitter':
      return 'X';
    case 'youtube':
      return 'YouTube';
    case 'tiktok':
      return 'TikTok';
    case 'reddit':
      return 'Reddit';
    case 'linkedin':
      return 'LinkedIn';
    case 'telegram':
      return 'Telegram';
    case 'whatsapp':
      return 'WhatsApp';
    case 'pinterest':
      return 'Pinterest';
    case 'twitch':
      return 'Twitch';
    case 'snapchat':
      return 'Snapchat';
    case 'instagram':
      return 'Instagram';
    case 'github':
      return 'GitHub';
    case 'hive':
      return 'Hive';
    default:
      if (kind.length === 0) {
        return kind;
      }
      return `${kind.slice(0, 1).toUpperCase()}${kind.slice(1)}`;
  }
}

/** External profile URL for a social link (mirrors legacy `socialTransformers`). */
export function buildLinkHref(kind: ProjectedObjectLinkKind | string, value: string): string {
  return resolveSocialLinkHref(kind, value);
}

export type ProjectedObjectLinkRow = {
  iconSrc: string;
  label: string;
  href: string;
};

/**
 * Rows from projected `fields.link` (multi JSON `LINK` update).
 * @see libs/core/src/update-registry/updates/link.ts
 * Preserves API order; each row is an external clickable link.
 */
export function projectedObjectLinkRows(o: ProjectedObjectView): ProjectedObjectLinkRow[] {
  const raw = o.fields.link;
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows: ProjectedObjectLinkRow[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }
    const typeRaw = readString(item.type);
    const valueRaw = typeof item.value === 'string' ? item.value.trim() : '';
    if (!typeRaw || valueRaw.length === 0) {
      continue;
    }
    const typeNorm = typeRaw.trim().toLowerCase();
    if (!isProjectedLinkKind(typeNorm)) {
      rows.push({
        iconSrc: '/images/icons/link-icon.svg',
        label: linkKindDisplayLabel(typeNorm),
        href: buildLinkHref(typeNorm, valueRaw),
      });
      continue;
    }
    rows.push({
      iconSrc: linkKindPublicIconSrc(typeNorm),
      label: linkKindDisplayLabel(typeNorm),
      href: buildLinkHref(typeNorm, valueRaw),
    });
  }
  return rows;
}

/** One row of `tagCategoryItem` after projection. */
export type ProjectedTagCategoryItemRow = {
  value: string;
  category: string;
  updateId?: string;
};

export type TagChipView = {
  value: string;
  updateId?: string;
};

export type TagCategorySectionView = {
  /** Display label from `tagCategory` / item `category`. */
  categoryTitle: string;
  tags: TagChipView[];
};

export function parseTagCategoryItemRows(o: ProjectedObjectView): ProjectedTagCategoryItemRow[] {
  const raw = o.fields.tagCategoryItem;
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows: ProjectedTagCategoryItemRow[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }
    const value = readString(item.value);
    const category = readString(item.category);
    const updateId = readString(item.update_id);
    if (value && category) {
      rows.push({
        value,
        category,
        ...(updateId ? { updateId } : {}),
      });
    }
  }
  return rows;
}

/**
 * View mode: sections follow `tagCategory` order; omit categories with no matching items.
 * If `tagCategory` is empty but items exist, sections follow first-seen category order in items.
 */
export function projectedTagCategorySections(o: ProjectedObjectView): TagCategorySectionView[] {
  const rows = parseTagCategoryItemRows(o);
  if (rows.length === 0) {
    return [];
  }

  const tagsByCategory = new Map<string, TagChipView[]>();
  for (const { category, value, updateId } of rows) {
    const chip: TagChipView = { value, ...(updateId ? { updateId } : {}) };
    const existing = tagsByCategory.get(category);
    if (!existing) {
      tagsByCategory.set(category, [chip]);
    } else if (!existing.some((tag) => tag.value === value)) {
      existing.push(chip);
    }
  }

  const orderedNames = projectedTagCategoryNames(o);
  const categorySequence =
    orderedNames.length > 0
      ? orderedNames
      : distinctCategoryOrderFromRows(rows);

  const sections: TagCategorySectionView[] = [];
  for (const name of categorySequence) {
    const tags = tagsByCategory.get(name);
    if (tags && tags.length > 0) {
      sections.push({ categoryTitle: name, tags });
    }
  }
  return sections;
}

/**
 * Edit mode: one section per `tagCategory` name (including empty categories).
 * Appends item-only categories not listed in `tagCategory` after known names.
 */
export function mergeTagCategorySectionsForEditMode(
  categoryNames: readonly string[],
  sections: readonly TagCategorySectionView[],
): TagCategorySectionView[] {
  const byCategory = new Map<string, TagChipView[]>();
  for (const section of sections) {
    byCategory.set(section.categoryTitle, section.tags);
  }

  const merged: TagCategorySectionView[] = [];
  const seen = new Set<string>();

  for (const name of categoryNames) {
    const trimmed = name.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    merged.push({
      categoryTitle: trimmed,
      tags: byCategory.get(trimmed) ?? [],
    });
  }

  for (const section of sections) {
    if (!seen.has(section.categoryTitle)) {
      merged.push(section);
    }
  }

  return merged;
}

function distinctCategoryOrderFromRows(rows: ProjectedTagCategoryItemRow[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const { category } of rows) {
    if (!seen.has(category)) {
      seen.add(category);
      order.push(category);
    }
  }
  return order;
}

/** Tag category names (`tagCategory` multi text). */
export function projectedTagCategoryNames(o: ProjectedObjectView): string[] {
  const raw = o.fields.tagCategory;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
}

/** Department path segments (`category` multi text). */
export function projectedCategoryNames(o: ProjectedObjectView): string[] {
  const raw = o.fields.category;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
}

/** On-chain gallery album names (`imageGallery` multi text). */
export function projectedGalleryAlbumNames(o: ProjectedObjectView): string[] {
  const raw = o.fields.imageGallery;
  if (!Array.isArray(raw)) {
    return [];
  }
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (typeof row !== 'string') {
      continue;
    }
    const name = row.trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }
  return names;
}

/** Collects `tagCategoryItem.value` in API order (legacy helpers / tagline). */
export function projectedTagCategoryItemValues(o: ProjectedObjectView): string[] {
  return parseTagCategoryItemRows(o).map((r) => r.value);
}

const CRYPTOCURRENCY_ICON_DIR = '/images/icons/cryptocurrencies';

/** One row for left-rail wallet display (non-interactive until copy/deeplinks exist). */
export type ProjectedWalletAddressRow = {
  iconSrc: string;
  lineText: string;
};

const WALLET_NAME_IN_PARENS = /^(.+?)\s*\([^)]+\)\s*$/;

/** Short display name for legacy `symbol`, e.g. `Bitcoin (BTC)` → `Bitcoin`, `LBTC` → `Lightning Bitcoin`. */
export function walletSymbolDisplayName(symbol: string): string {
  const t = symbol.trim();
  if (!t) {
    return t;
  }
  const upper = t.toUpperCase();
  if (upper === 'LBTC') {
    return 'Lightning Bitcoin';
  }
  if (upper === 'BTC') {
    return 'Bitcoin';
  }
  if (upper === 'LTC') {
    return 'Litecoin';
  }
  if (upper === 'ETH') {
    return 'Ethereum';
  }
  const m = t.match(WALLET_NAME_IN_PARENS);
  if (m) {
    return m[1].trim();
  }
  return t;
}

/** Resolves public icon path under {@link CRYPTOCURRENCY_ICON_DIR} (Waivio parity filenames). */
export function walletSymbolIconSrc(symbol: string): string {
  const compact = symbol.trim().toUpperCase().replace(/\s+/g, '');
  if (compact.includes('LIGHTNING') || compact === 'LBTC') {
    return `${CRYPTOCURRENCY_ICON_DIR}/lightning_bitcoin.png`;
  }
  if (compact.includes('LITECOIN') || compact.endsWith('LTC')) {
    return `${CRYPTOCURRENCY_ICON_DIR}/litecoin.png`;
  }
  if (compact.includes('ETHEREUM') || compact.endsWith('ETH')) {
    return `${CRYPTOCURRENCY_ICON_DIR}/ethereum.png`;
  }
  if (compact === 'HBD' || compact.endsWith('HBD')) {
    return `${CRYPTOCURRENCY_ICON_DIR}/hbd.png`;
  }
  if (compact === 'HIVE' || compact.endsWith('HIVE')) {
    return `${CRYPTOCURRENCY_ICON_DIR}/hive.png`;
  }
  if (compact === 'WAIV' || compact.endsWith('WAIV')) {
    return `${CRYPTOCURRENCY_ICON_DIR}/waiv.png`;
  }
  if (compact.includes('BITCOIN') || compact.endsWith('BTC')) {
    return `${CRYPTOCURRENCY_ICON_DIR}/bitcoin.png`;
  }
  return `${CRYPTOCURRENCY_ICON_DIR}/bitcoin.png`;
}

/**
 * Wallet list for view mode: preserves API order; icon + line per legacy rules
 * (title-only when `title` set, else `Name: address`).
 */
export function projectedWalletAddressRows(o: ProjectedObjectView): ProjectedWalletAddressRow[] {
  const raw = o.fields.walletAddress;
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows: ProjectedWalletAddressRow[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }
    const symbol = readString(item.symbol);
    const address = readString(item.address);
    const title = item.title != null ? readString(item.title) : undefined;
    if (!symbol || !address) {
      continue;
    }
    const iconSrc = walletSymbolIconSrc(symbol);
    const lineText =
      title && title.length > 0 ? title : `${walletSymbolDisplayName(symbol)}: ${address}`;
    rows.push({ iconSrc, lineText });
  }
  return rows;
}

function readPreviewGalleryFromApi(o: ProjectedObjectView): ProjectedGalleryPhotoView[] {
  const raw = (o as ProjectedObjectView & { previewGallery?: unknown }).previewGallery;
  if (!Array.isArray(raw)) {
    return [];
  }
  const photos: ProjectedGalleryPhotoView[] = [];
  for (const row of raw) {
    if (!isRecord(row)) {
      continue;
    }
    const url = readString(row.url);
    if (!url) {
      continue;
    }
    const cid = readString(row.cid) ?? undefined;
    const rankScore =
      typeof row.rankScore === 'number' && Number.isFinite(row.rankScore)
        ? row.rankScore
        : null;
    const viewerRank =
      typeof row.viewerRank === 'number' && Number.isFinite(row.viewerRank)
        ? row.viewerRank
        : null;
    const updateId = readString(row.update_id) ?? undefined;
    photos.push({
      url,
      rankScore,
      isAvatar: row.isAvatar === true,
      ...(cid ? { cid } : {}),
      ...(updateId ? { update_id: updateId, viewerRank } : {}),
    });
  }
  return photos;
}

function readGalleryAlbumsFromApi(o: ProjectedObjectView): ProjectedGalleryAlbumView[] {
  const raw = (o as ProjectedObjectView & { galleryAlbums?: unknown }).galleryAlbums;
  if (!Array.isArray(raw)) {
    return [];
  }
  const albums: ProjectedGalleryAlbumView[] = [];
  for (const row of raw) {
    if (!isRecord(row)) {
      continue;
    }
    const name = readString(row.name);
    if (!name) {
      continue;
    }
    const itemsRaw = row.items;
    const items: ProjectedGalleryPhotoView[] = [];
    if (Array.isArray(itemsRaw)) {
      for (const item of itemsRaw) {
        if (!isRecord(item)) {
          continue;
        }
        const url = readString(item.url);
        if (!url) {
          continue;
        }
        const cid = readString(item.cid) ?? undefined;
        const rankScore =
          typeof item.rankScore === 'number' && Number.isFinite(item.rankScore)
            ? item.rankScore
            : null;
        const viewerRank =
          typeof item.viewerRank === 'number' && Number.isFinite(item.viewerRank)
            ? item.viewerRank
            : null;
        const updateId = readString(item.update_id) ?? undefined;
        items.push({
          url,
          rankScore,
          isAvatar: item.isAvatar === true,
          ...(cid ? { cid } : {}),
          ...(updateId ? { update_id: updateId, viewerRank } : {}),
        });
      }
    }
    albums.push({ name, items });
  }
  return albums;
}

/** Grouped gallery albums from resolve (`galleryAlbums`). */
export function projectedGalleryAlbums(o: ProjectedObjectView): ProjectedGalleryAlbumView[] {
  return readGalleryAlbumsFromApi(o);
}

/** Photos-album preview from resolve (`previewGallery`) with legacy field fallback. */
export function projectedPreviewGallery(o: ProjectedObjectView): ProjectedGalleryPhotoView[] {
  const fromApi = readPreviewGalleryFromApi(o);
  if (fromApi.length > 0) {
    return fromApi;
  }
  return projectedGalleryImageUrlsFromFields(o).map((url) => ({
    url,
    rankScore: null,
    isAvatar: false,
  }));
}

/**
 * Left-rail gallery carousel.
 * Non-avatar photos only, except options types (`product`, `book`, `service`):
 * an avatar-only preview stays so option hover has a frame.
 */
export function projectedLeftRailPreviewGallery(
  o: ProjectedObjectView,
): ProjectedGalleryPhotoView[] {
  const photos = projectedPreviewGallery(o);
  const content = photos.filter((photo) => !photo.isAvatar);
  if (content.length > 0) {
    return content;
  }
  if (isOptionsObjectType(o.object_type ?? '') && photos.length > 0) {
    return photos;
  }
  return [];
}

function projectedGalleryImageUrlsFromFields(o: ProjectedObjectView, max = 8): string[] {
  const raw = o.fields.imageGalleryItem;
  if (!Array.isArray(raw)) {
    return [];
  }
  const urls: string[] = [];
  for (const row of raw) {
    if (!isRecord(row)) {
      continue;
    }
    const url = readString(row.url);
    if (url) {
      urls.push(url);
    }
    if (urls.length >= max) {
      break;
    }
  }
  return urls;
}

/** HTTPS URLs from projected gallery (preview or raw fields). */
export function projectedGalleryImageUrls(o: ProjectedObjectView, max = 8): string[] {
  const preview = readPreviewGalleryFromApi(o);
  if (preview.length > 0) {
    return preview.slice(0, max).map((p) => p.url);
  }
  return projectedGalleryImageUrlsFromFields(o, max);
}
