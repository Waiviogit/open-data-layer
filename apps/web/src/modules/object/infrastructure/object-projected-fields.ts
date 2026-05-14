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

/**
 * Canonical `link.type` strings — mirror {@link libs/core/src/update-registry/updates/link.ts}
 * (do not import `@opden-data-layer/core` in this Next-facing module).
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

function isProjectedLinkKind(type: string): type is ProjectedObjectLinkKind {
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

export type ProjectedObjectLinkRow = {
  iconSrc: string;
  label: string;
};

/**
 * Rows from projected `fields.link` (multi JSON `LINK` update).
 * @see libs/core/src/update-registry/updates/link.ts
 * Preserves API order; shows icon + channel label only (URLs deferred until actions exist).
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
      });
      continue;
    }
    rows.push({
      iconSrc: linkKindPublicIconSrc(typeNorm),
      label: linkKindDisplayLabel(typeNorm),
    });
  }
  return rows;
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
