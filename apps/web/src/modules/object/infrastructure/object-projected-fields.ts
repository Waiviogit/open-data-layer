import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';

import type { ProjectedMenuItem } from '../domain/projected-menu-item.types';

export type { ProjectedMenuItem } from '../domain/projected-menu-item.types';

/** Structured address (`address` update). */
export type ProjectedAddress = {
  street: string;
  locality: string;
  postal_code: string;
  country: string;
  state?: string;
  suite?: string;
};

/** Custom menu ordering (`sortCustom` update). */
export type ProjectedSortCustom = {
  include: string[];
  exclude: string[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function readString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
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

/** Builds one display line from structured address fields. */
export function formatProjectedAddress(a: ProjectedAddress): string {
  const parts = [
    a.suite ? `${a.suite}, ${a.street}` : a.street,
    [a.locality, a.state].filter(Boolean).join(', '),
    [a.postal_code, a.country].filter(Boolean).join(' '),
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

export function projectedMenuItems(o: ProjectedObjectView): ProjectedMenuItem[] {
  const raw = o.fields.menuItem;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ProjectedMenuItem[] = [];
  for (const row of raw) {
    if (!isRecord(row)) {
      continue;
    }
    const title = readString(row.title);
    const style = readString(row.style);
    if (!title || !style) {
      continue;
    }
    const link_to_object = readString(row.link_to_object);
    const link_to_web = readString(row.link_to_web);
    const object_type = readString(row.object_type);
    const image = readString(row.image);
    if (!link_to_object && !link_to_web) {
      continue;
    }
    out.push({
      title,
      style,
      ...(image ? { image } : {}),
      ...(link_to_object ? { link_to_object } : {}),
      ...(link_to_web ? { link_to_web } : {}),
      ...(object_type ? { object_type } : {}),
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
  return { include: inc, exclude: exc };
}

function menuItemMatchesKey(item: ProjectedMenuItem, key: string): boolean {
  if (item.title === key) {
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
  const used = new Set<ProjectedMenuItem>();
  for (const key of sort.include) {
    const found = base.find((item) => !used.has(item) && menuItemMatchesKey(item, key));
    if (found) {
      picked.push(found);
      used.add(found);
    }
  }
  for (const item of base) {
    if (!used.has(item)) {
      picked.push(item);
    }
  }
  return picked;
}

export function projectedWorkHours(o: ProjectedObjectView): string | null {
  return readString(o.fields.workHours) ?? null;
}

export function projectedPrice(o: ProjectedObjectView): string | null {
  return readString(o.fields.price) ?? null;
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

/** Telephone values (`telephone` update — single string or multi-array from projection). */
export function projectedTelephones(o: ProjectedObjectView): string[] {
  const raw = o.fields.telephone;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return [raw.trim()];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
}

export function projectedEmail(o: ProjectedObjectView): string | null {
  const raw = o.fields.email;
  return typeof raw === 'string' && raw.includes('@') ? raw.trim() : null;
}

/** One row of `tagCategoryItem` after projection. */
export type ProjectedTagCategoryItemRow = {
  value: string;
  category: string;
};

export type TagCategorySectionView = {
  /** Display label from `tagCategory` / item `category`. */
  categoryTitle: string;
  values: string[];
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
    if (value && category) {
      rows.push({ value, category });
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

  const valuesByCategory = new Map<string, string[]>();
  for (const { category, value } of rows) {
    const existing = valuesByCategory.get(category);
    if (!existing) {
      valuesByCategory.set(category, [value]);
    } else if (!existing.includes(value)) {
      existing.push(value);
    }
  }

  const orderedNames = projectedTagCategoryNames(o);
  const categorySequence =
    orderedNames.length > 0
      ? orderedNames
      : distinctCategoryOrderFromRows(rows);

  const sections: TagCategorySectionView[] = [];
  for (const name of categorySequence) {
    const values = valuesByCategory.get(name);
    if (values && values.length > 0) {
      sections.push({ categoryTitle: name, values });
    }
  }
  return sections;
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

/** Collects `tagCategoryItem.value` in API order (legacy helpers / tagline). */
export function projectedTagCategoryItemValues(o: ProjectedObjectView): string[] {
  return parseTagCategoryItemRows(o).map((r) => r.value);
}

/** HTTPS URLs from projected gallery items (resolved `url` when present). */
export function projectedGalleryImageUrls(o: ProjectedObjectView, max = 8): string[] {
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
