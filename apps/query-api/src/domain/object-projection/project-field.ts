import { UPDATE_REGISTRY, UPDATE_TYPES } from '@opden-data-layer/core';
import type { ResolvedField } from '@opden-data-layer/objects-domain';
import { imageContentUrlForCid, pickSingleImageDisplayUrlFromResolvedUpdate } from './image-display-url';
import type { ProjectedAggregateRatingRow, RankVoteProjection } from './projected-object.types';
import { emptyRankVoteProjection } from './projected-object.types';
import { JsonValue } from '@opden-data-layer/odl-db-types';

/** PostGIS EWKB flag: next uint32 is SRID. @see https://postgis.net/docs/using_postgis_dbmanagement.html#EWKB_EWKT */
const POSTGIS_WKB_SRID_FLAG = 0x20000000;
const OGC_WKB_POINT = 1;

function latLonFromEwkbPoint(buffer: Buffer): { latitude: number; longitude: number } | null {
  if (buffer.length < 21) {
    return null;
  }
  const bo = buffer.readUInt8(0);
  const littleEndian = bo === 1;
  if (bo !== 0 && bo !== 1) {
    return null;
  }
  let off = 1;
  const readU32 = (o: number) =>
    littleEndian ? buffer.readUInt32LE(o) : buffer.readUInt32BE(o);
  const readF64 = (o: number) =>
    littleEndian ? buffer.readDoubleLE(o) : buffer.readDoubleBE(o);

  let gtype = readU32(off);
  off += 4;
  if (gtype & POSTGIS_WKB_SRID_FLAG) {
    if (off + 4 > buffer.length) {
      return null;
    }
    off += 4;
    gtype &= ~POSTGIS_WKB_SRID_FLAG;
  }
  if (gtype !== OGC_WKB_POINT) {
    return null;
  }
  if (off + 16 > buffer.length) {
    return null;
  }
  const longitude = readF64(off);
  const latitude = readF64(off + 8);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

function latLonFromWktPoint(value: string): { latitude: number; longitude: number } | null {
  const trimmed = value.trim();
  const withoutSrid = trimmed.replace(/^SRID=\d+;/i, '').trim();
  const m = withoutSrid.match(
    /^POINT\s*\(\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*\)\s*$/i,
  );
  if (!m) {
    return null;
  }
  const longitude = Number(m[1]);
  const latitude = Number(m[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

function toBuffer(valueGeo: unknown): Buffer | null {
  if (Buffer.isBuffer(valueGeo)) {
    return valueGeo;
  }
  if (valueGeo instanceof Uint8Array) {
    return Buffer.from(valueGeo);
  }
  if (typeof valueGeo === 'string') {
    const t = valueGeo.trim();
    if (/^[0-9a-fA-F]+$/.test(t) && t.length >= 42 && t.length % 2 === 0) {
      return Buffer.from(t, 'hex');
    }
  }
  return null;
}

/**
 * Reads a PostGIS `geography(Point)` / GeoJSON Point into `{ latitude, longitude }`.
 *
 * `node-pg` returns EWKB in a `Buffer` unless the query uses `ST_AsGeoJSON`; GeoJSON objects are
 * also accepted (indexer inserts and some callers).
 */
export function geoJsonPointToLatLon(valueGeo: unknown): { latitude: number; longitude: number } | null {
  if (valueGeo == null) {
    return null;
  }

  const asBuf = toBuffer(valueGeo);
  if (asBuf) {
    return latLonFromEwkbPoint(asBuf);
  }

  if (typeof valueGeo === 'string') {
    return latLonFromWktPoint(valueGeo);
  }

  if (typeof valueGeo !== 'object' || Array.isArray(valueGeo)) {
    return null;
  }
  const g = valueGeo as { type?: string; coordinates?: unknown };
  if (g.type !== 'Point' || !Array.isArray(g.coordinates) || g.coordinates.length < 2) {
    return null;
  }
  const lng = Number(g.coordinates[0]);
  const lat = Number(g.coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

function resolveDisplayUrlFromImageJson(
  value: JsonValue | null,
  contentBaseUrl: string | undefined,
): string | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const o = value as Record<string, unknown>;
  const url = typeof o.url === 'string' && o.url.trim().length > 0 ? o.url.trim() : null;
  if (url) {
    return url;
  }
  const cid = typeof o.cid === 'string' && o.cid.trim().length > 0 ? o.cid.trim() : null;
  if (cid && contentBaseUrl?.trim()) {
    return imageContentUrlForCid(contentBaseUrl.trim(), cid);
  }
  return null;
}

function resolveViewerRank(
  viewerAccount: string | null | undefined,
  rankVoteProjection: RankVoteProjection,
  updateId: string,
): number | null {
  const viewerRankRaw =
    viewerAccount?.trim()
      ? rankVoteProjection.viewerRankByUpdateId.get(updateId)
      : undefined;
  return viewerRankRaw != null &&
    typeof viewerRankRaw === 'number' &&
    Number.isFinite(viewerRankRaw)
    ? viewerRankRaw
    : null;
}

/** Project gallery item JSON to `{ ...rest, url, rank_score, viewer_rank, update_id }` when cid/url present. */
function projectImageGalleryItemJson(
  value: JsonValue | null,
  contentBaseUrl: string | undefined,
  rankScore: number | null,
  updateId: string,
  viewerRank: number | null,
): JsonValue | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const o = value as Record<string, JsonValue>;
  const display = resolveDisplayUrlFromImageJson(value, contentBaseUrl);
  const url: JsonValue = (display ?? o.url ?? null) as JsonValue;
  if (url == null || typeof url !== 'string' || url.trim().length === 0) {
    return null;
  }
  return { ...o, url, rank_score: rankScore, viewer_rank: viewerRank, update_id: updateId };
}

/** Project tag item JSON to `{ ...rest, update_id }` when category and value present. */
function projectTagCategoryItemJson(
  value: JsonValue | null,
  updateId: string,
): JsonValue | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const o = value as Record<string, JsonValue>;
  const category = typeof o.category === 'string' ? o.category.trim() : '';
  const tagValue = typeof o.value === 'string' ? o.value.trim() : '';
  if (category.length === 0 || tagValue.length === 0) {
    return null;
  }
  return { ...o, category, value: tagValue, update_id: updateId };
}

function coerceRankScore(raw: unknown): number | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'bigint') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function projectAggregateRatingField(
  field: ResolvedField,
  viewerAccount: string | null | undefined,
  rankVoteProjection: RankVoteProjection,
): ProjectedAggregateRatingRow[] {
  const displayable = field.values.filter((u) => {
    if (u.validity_status === 'VALID') {
      return true;
    }
    return u.validity_status === 'REJECTED' && coerceRankScore(u.rank_score) !== null;
  });
  return displayable.map((u): ProjectedAggregateRatingRow => {
    const avg = coerceRankScore(u.rank_score);
    const totalVoters = rankVoteProjection.countByUpdateId.get(u.update_id) ?? 0;
    const viewerRankRaw =
      viewerAccount?.trim()
        ? rankVoteProjection.viewerRankByUpdateId.get(u.update_id)
        : undefined;
    const userRating =
      viewerRankRaw != null && typeof viewerRankRaw === 'number' && Number.isFinite(viewerRankRaw)
        ? viewerRankRaw
        : null;
    return {
      update_id: u.update_id,
      dimension: typeof u.value_text === 'string' && u.value_text.length > 0 ? u.value_text : '',
      averageRating: avg,
      userRating,
      totalVoters,
    };
  });
}

function projectMetadataField(field: ResolvedField): Record<string, string> | null {
  const valid = field.values.filter((u) => u.validity_status === 'VALID');
  if (valid.length === 0) {
    return null;
  }
  const record: Record<string, string> = {};
  for (const row of valid) {
    const json = row.value_json;
    if (json == null || typeof json !== 'object' || Array.isArray(json)) {
      continue;
    }
    const o = json as Record<string, unknown>;
    const key = typeof o.key === 'string' ? o.key.trim() : '';
    const value = typeof o.value === 'string' ? o.value.trim() : '';
    if (key.length === 0 || value.length === 0) {
      continue;
    }
    if (!(key in record)) {
      record[key] = value;
    }
  }
  return Object.keys(record).length > 0 ? record : null;
}

/**
 * Maps a resolved field to a presentation value (excluding `object_ref`, handled separately).
 */
export function projectFieldValue(
  field: ResolvedField,
  updateType: string,
  contentBaseUrl: string | undefined,
  viewerAccount?: string | null,
  rankVoteProjection: RankVoteProjection = emptyRankVoteProjection(),
): unknown {
  const def = UPDATE_REGISTRY[updateType];
  if (!def || def.value_kind === 'object_ref') {
    return null;
  }

  if (updateType === UPDATE_TYPES.AGGREGATE_RATING) {
    return projectAggregateRatingField(field, viewerAccount, rankVoteProjection);
  }

  if (updateType === UPDATE_TYPES.METADATA) {
    return projectMetadataField(field);
  }

  const valid = field.values.filter((u) => u.validity_status === 'VALID');

  switch (def.value_kind) {
    case 'text':
    case 'user_ref': {
      if (def.cardinality === 'single') {
        return valid[0]?.value_text ?? null;
      }
      return valid.map((u) => u.value_text).filter((t): t is string => typeof t === 'string' && t.length > 0);
    }
    case 'geo': {
      return geoJsonPointToLatLon(valid[0]?.value_geo ?? null);
    }
    case 'json': {
      if (def.cardinality === 'single') {
        const row = valid[0];
        if (!row) {
          return null;
        }
        if (
          updateType === UPDATE_TYPES.IMAGE ||
          updateType === UPDATE_TYPES.IMAGE_BACKGROUND ||
          updateType === UPDATE_TYPES.AFFILIATE_BUTTON
        ) {
          return pickSingleImageDisplayUrlFromResolvedUpdate(row, contentBaseUrl);
        }
        return row.value_json ?? null;
      }
      if (updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM) {
        return valid
          .map((u) =>
            projectImageGalleryItemJson(
              u.value_json,
              contentBaseUrl,
              coerceRankScore(u.rank_score),
              u.update_id,
              resolveViewerRank(viewerAccount, rankVoteProjection, u.update_id),
            ),
          )
          .filter((x) => x != null);
      }
      if (updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM) {
        return valid
          .map((u) => projectTagCategoryItemJson(u.value_json, u.update_id))
          .filter((x) => x != null);
      }
      return valid.map((u) => u.value_json ?? null);
    }
    default:
      return null;
  }
}
