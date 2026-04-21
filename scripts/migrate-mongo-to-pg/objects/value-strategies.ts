import type { MongoWObjectField } from './types';
import type { JsonValue } from './utils';
import { keysCamelToSnake } from './utils';

export type JsonTransformResult =
  | { ok: true; value: JsonValue }
  | { ok: false; reason: string };

/** One Mongo JSON field → N `object_updates` rows (e.g. legacy `link`). */
export type JsonTransformMultiResult =
  | { ok: true; values: { suffix: string; value: JsonValue }[] }
  | { ok: false; reason: string };

/** Legacy Mongo social keys → ODL `link.type` (migration-only). */
const LEGACY_LINK_KEY_MAP: Record<string, string> = {
  linkFacebook: 'facebook',
  linkTwitter: 'twitter',
  linkYouTube: 'youtube',
  linkTikTok: 'tiktok',
  linkReddit: 'reddit',
  linkLinkedIn: 'linkedin',
  linkTelegram: 'telegram',
  linkWhatsApp: 'whatsapp',
  linkPinterest: 'pinterest',
  linkTwitch: 'twitch',
  linkSnapchat: 'snapchat',
  linkInstagram: 'instagram',
  linkGitHub: 'github',
  linkHive: 'hive',
};

export interface JsonValueStrategy {
  supports(legacyFieldName: string, updateType: string): boolean;
  transform(rawBody: string, legacyFieldName: string): JsonTransformResult;
}

function parseJson(rawBody: string): JsonValue | null {
  const trimmed = rawBody?.trim() ?? '';
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as JsonValue;
  } catch {
    return null;
  }
}

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

const ZIP_IN_SEGMENT = /\d{4,}/;
const LOCALITY_WITH_TRAILING_ZIP = /^(.+?)\s+(\d{4,})\s*$/;

/** Fallback postal when none found (schema requires min length 1). */
const PLACEHOLDER_POSTAL = '0';

const PLACEHOLDER_COUNTRY = 'Unknown';

type AddressPayload = {
  street: string;
  locality: string;
  postal_code: string;
  country: string;
  state?: string;
};

function parsePackedAddressDegenerate(
  parts: string[],
): AddressPayload | null {
  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    const only = parts[0];
    if (only === undefined) {
      return null;
    }
    return {
      street: only,
      locality: only,
      postal_code: PLACEHOLDER_POSTAL,
      country: PLACEHOLDER_COUNTRY,
    };
  }
  const country = parts.at(-1);
  const head = parts[0];
  if (country === undefined || head === undefined) {
    return null;
  }
  const street = parts.slice(0, -1).join(', ');
  return {
    street,
    locality: head,
    postal_code: PLACEHOLDER_POSTAL,
    country,
  };
}

/**
 * Single-line legacy addresses: comma-separated segments, often
 * `..., locality postal, state, country`.
 */
function parsePackedAddressLine(line: string): AddressPayload | null {
  const parts = line
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length < 3) {
    return parsePackedAddressDegenerate(parts);
  }

  const country = parts.at(-1);
  if (country === undefined) {
    return null;
  }
  const rest = parts.slice(0, -1);
  const last = rest.at(-1);
  if (last === undefined) {
    return null;
  }
  const prev = rest.length >= 2 ? rest.at(-2) : undefined;

  let state: string | undefined;
  let localityZip: string;
  let streetParts: string[];

  if (
    rest.length >= 3 &&
    !ZIP_IN_SEGMENT.test(last) &&
    prev !== undefined &&
    ZIP_IN_SEGMENT.test(prev)
  ) {
    state = last;
    localityZip = prev;
    streetParts = rest.slice(0, -2);
  } else if (ZIP_IN_SEGMENT.test(last) || LOCALITY_WITH_TRAILING_ZIP.test(last)) {
    localityZip = last;
    streetParts = rest.slice(0, -1);
  } else {
    localityZip = last;
    streetParts = rest.slice(0, -1);
  }

  const street =
    streetParts.length > 0 ? streetParts.join(', ') : localityZip;
  if (!street.length || !country.length) {
    return null;
  }

  const zipMatch = localityZip.match(LOCALITY_WITH_TRAILING_ZIP);
  let locality: string;
  let postal_code: string;
  if (zipMatch) {
    const locGroup = zipMatch[1];
    const zipGroup = zipMatch[2];
    if (locGroup === undefined || zipGroup === undefined) {
      return null;
    }
    locality = locGroup.trim();
    postal_code = zipGroup;
  } else {
    locality = localityZip;
    const m = line.match(/\b(\d{4,})\b/);
    postal_code = m?.[1] ?? PLACEHOLDER_POSTAL;
  }

  if (!locality.length) {
    locality = postal_code;
  }

  const out: AddressPayload = { street, locality, postal_code, country };
  if (state?.length) {
    out.state = state;
  }
  return out;
}

function legacyAddressToPayload(o: Record<string, unknown>): AddressPayload | null {
  const rawAddress = trimStr(o.address);
  const city = trimStr(o.city);
  const state = trimStr(o.state);
  const postalCode = trimStr(o.postalCode);
  const country = trimStr(o.country);

  const structured =
    city.length > 0 && postalCode.length > 0 && country.length > 0;

  if (structured) {
    const street = rawAddress.length > 0 ? rawAddress : city;
    if (!street.length) {
      return null;
    }
    const out: AddressPayload = {
      street,
      locality: city,
      postal_code: postalCode,
      country,
    };
    if (state.length > 0) {
      out.state = state;
    }
    return out;
  }

  if (!rawAddress.length) {
    return null;
  }

  return parsePackedAddressLine(rawAddress);
}

/** Legacy Waivio `address` JSON -> ODL address schema (street, locality, postal_code, country, state?). */
export const addressStrategy: JsonValueStrategy = {
  supports(_legacyFieldName: string, updateType: string): boolean {
    void _legacyFieldName;
    return updateType === 'address';
  },
  transform(rawBody: string): JsonTransformResult {
    const parsed = parseJson(rawBody);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, reason: 'address: body is not a JSON object' };
    }
    const payload = legacyAddressToPayload(parsed as Record<string, unknown>);
    if (!payload) {
      return { ok: false, reason: 'address: could not map legacy fields' };
    }
    return { ok: true, value: payload as JsonValue };
  },
};

/**
 * Legacy Waivio `{ name, author_permlink }` JSON in `field.body` — ODL `object_ref`
 * stores only `author_permlink` as `value_text` (no `name`).
 */
const LEGACY_NAME_AUTHOR_PERMLINK_OBJECT_REF_TYPES = new Set([
  'authors',
  'brand',
  'manufacturer',
  'merchant',
  'publisher',
]);

function legacyJsonBodyToAuthorPermlinkObject(
  rawBody: string,
): Record<string, unknown> | null {
  const parsed = parseJson(rawBody);
  if (parsed === null) {
    return null;
  }
  if (Array.isArray(parsed)) {
    const first = parsed[0];
    if (
      first !== undefined &&
      typeof first === 'object' &&
      first !== null &&
      !Array.isArray(first)
    ) {
      return first as Record<string, unknown>;
    }
    return null;
  }
  if (typeof parsed === 'object' && parsed !== null) {
    return parsed as Record<string, unknown>;
  }
  return null;
}

/**
 * Maps legacy Mongo `field.body` to a single object_id string for `value_text`.
 * For known legacy JSON shapes, only `author_permlink` is kept (not `name`).
 */
export function migrateObjectRefBodyToText(
  rawBody: string,
  updateType: string,
): { ok: true; value: string } | { ok: false; reason: string } {
  if (LEGACY_NAME_AUTHOR_PERMLINK_OBJECT_REF_TYPES.has(updateType)) {
    const o = legacyJsonBodyToAuthorPermlinkObject(rawBody);
    if (o === null) {
      return {
        ok: false,
        reason: `${updateType}: body is not a JSON object (or empty array)`,
      };
    }
    const objectId = trimStr(o.author_permlink);
    if (!objectId.length) {
      return { ok: false, reason: `${updateType}: missing or empty author_permlink` };
    }
    if (objectId.length < 3) {
      return { ok: false, reason: `${updateType}: author_permlink too short` };
    }
    return { ok: true, value: objectId };
  }
  const trimmed = rawBody?.trim() ?? '';
  if (trimmed.length < 3) {
    return { ok: false, reason: 'object_ref: empty or too short body' };
  }
  return { ok: true, value: trimmed };
}

/** Legacy companyId / productId -> ODL identifier `{ value, type, image? }`. */
export const identifierStrategy: JsonValueStrategy = {
  supports(legacyFieldName: string, updateType: string): boolean {
    return (
      updateType === 'identifier' &&
      (legacyFieldName === 'companyId' || legacyFieldName === 'productId')
    );
  },
  transform(rawBody: string, legacyFieldName: string): JsonTransformResult {
    const parsed = parseJson(rawBody);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, reason: 'identifier: body is not a JSON object' };
    }
    const o = parsed as Record<string, unknown>;
    let value: string | undefined;
    let type: string | undefined;
    if (legacyFieldName === 'companyId') {
      value =
        typeof o.companyId === 'string' ? o.companyId : undefined;
      type =
        typeof o.companyIdType === 'string' ? o.companyIdType : undefined;
    } else {
      value =
        typeof o.productId === 'string' ? o.productId : undefined;
      type =
        typeof o.productIdType === 'string' ? o.productIdType : undefined;
    }
    const image =
      typeof o.image === 'string' ? o.image : undefined;
    if (!value?.length || !type?.length) {
      return {
        ok: false,
        reason: 'identifier: missing value or type after legacy reshape',
      };
    }
    const out: JsonValue = { value, type };
    if (image !== undefined) {
      (out as Record<string, JsonValue>).image = image;
    }
    return { ok: true, value: out };
  },
};

export const defaultJsonStrategy: JsonValueStrategy = {
  supports(legacyFieldName: string, updateType: string): boolean {
    void legacyFieldName;
    void updateType;
    return true;
  },
  transform(rawBody: string): JsonTransformResult {
    const parsed = parseJson(rawBody);
    if (parsed === null) {
      return { ok: false, reason: 'json: empty or invalid JSON' };
    }
    return { ok: true, value: keysCamelToSnake(parsed) };
  },
};

const STRATEGIES_ORDERED: JsonValueStrategy[] = [
  identifierStrategy,
  addressStrategy,
  defaultJsonStrategy,
];

function transformLinkLegacyBody(rawBody: string): JsonTransformMultiResult {
  const parsed = parseJson(rawBody);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'link: body is not a JSON object' };
  }
  const values: { suffix: string; value: JsonValue }[] = [];
  for (const [key, raw] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    const linkType = LEGACY_LINK_KEY_MAP[key];
    if (linkType === undefined) {
      continue;
    }
    const val = typeof raw === 'string' ? raw.trim() : '';
    if (!val.length) {
      continue;
    }
    values.push({
      suffix: `_${linkType}`,
      value: { type: linkType, value: val } as JsonValue,
    });
  }
  if (values.length === 0) {
    return { ok: false, reason: 'link: no known non-empty link keys' };
  }
  return { ok: true, values };
}

/**
 * Returns a multi-row transform for legacy fields that expand to several updates.
 * `null` means use the single-value {@link transformJsonBody} path.
 */
export function transformJsonBodyMulti(
  legacyFieldName: string,
  updateType: string,
  rawBody: string,
): JsonTransformMultiResult | null {
  void legacyFieldName;
  if (updateType !== 'link') {
    return null;
  }
  return transformLinkLegacyBody(rawBody);
}

/** Legacy epoch on field: ms (>1e12) → seconds for ODL `start_date` / `end_date`. */
function normalizeLegacyEpoch(n: number): number {
  const t = Math.trunc(n);
  if (!Number.isFinite(t) || t <= 0) {
    return t;
  }
  if (t > 1_000_000_000_000) {
    return Math.trunc(t / 1000);
  }
  return t;
}

/**
 * Legacy `promotion` / `sale`: `value` from `field.body`, dates from `field.startDate` / `field.endDate`.
 * Returns `null` for other update types (caller uses {@link transformJsonBody}).
 */
export function transformPromotionSaleFromField(
  updateType: string,
  field: MongoWObjectField,
): JsonTransformResult | null {
  if (updateType !== 'promotion' && updateType !== 'saleEvent') {
    return null;
  }
  const value = typeof field.body === 'string' ? field.body.trim() : '';
  if (!value.length) {
    return { ok: false, reason: `${updateType}: empty body` };
  }
  const out: Record<string, JsonValue> = { value };
  const start = field.startDate;
  const end = field.endDate;
  if (typeof start === 'number' && Number.isFinite(start)) {
    const sd = normalizeLegacyEpoch(start);
    if (sd > 0) {
      out.start_date = sd;
    }
  }
  if (typeof end === 'number' && Number.isFinite(end)) {
    const ed = normalizeLegacyEpoch(end);
    if (ed > 0) {
      out.end_date = ed;
    }
  }
  return { ok: true, value: out as JsonValue };
}

export function transformJsonBody(
  legacyFieldName: string,
  updateType: string,
  rawBody: string,
): JsonTransformResult {
  for (const s of STRATEGIES_ORDERED) {
    if (s.supports(legacyFieldName, updateType)) {
      return s.transform(rawBody, legacyFieldName);
    }
  }
  return defaultJsonStrategy.transform(rawBody, legacyFieldName);
}
