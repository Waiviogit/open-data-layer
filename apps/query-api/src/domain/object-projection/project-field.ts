import type { JsonValue } from '@opden-data-layer/core';
import { UPDATE_REGISTRY, UPDATE_TYPES } from '@opden-data-layer/core';
import type { ResolvedField } from '@opden-data-layer/objects-domain';
import { ipfsGatewayUrlForCid, pickSingleImageDisplayUrlFromResolvedUpdate } from './image-display-url';
import type { ProjectedAggregateRating } from './projected-object.types';

/** GeoJSON Point → `{ latitude, longitude }` for presentation. */
export function geoJsonPointToLatLon(valueGeo: unknown): { latitude: number; longitude: number } | null {
  if (valueGeo == null || typeof valueGeo !== 'object' || Array.isArray(valueGeo)) {
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

function resolveDisplayUrlFromImageJson(value: JsonValue | null, ipfsGatewayBaseUrl: string): string | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const o = value as Record<string, unknown>;
  const url = typeof o.url === 'string' && o.url.trim().length > 0 ? o.url.trim() : null;
  if (url) {
    return url;
  }
  const cid = typeof o.cid === 'string' && o.cid.trim().length > 0 ? o.cid.trim() : null;
  if (cid) {
    return ipfsGatewayUrlForCid(ipfsGatewayBaseUrl, cid);
  }
  return null;
}

/** Project gallery item JSON to `{ ...rest, url: displayUrl }` when cid/url present. */
function projectImageGalleryItemJson(value: JsonValue | null, ipfsGatewayBaseUrl: string): JsonValue | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const o = value as Record<string, JsonValue>;
  const display = resolveDisplayUrlFromImageJson(value, ipfsGatewayBaseUrl);
  const url: JsonValue = (display ?? o.url ?? null) as JsonValue;
  return { ...o, url };
}

function projectAggregateRatingField(
  field: ResolvedField,
  viewerAccount: string | null | undefined,
): ProjectedAggregateRating {
  const valid = field.values.filter((u) => u.validity_status === 'VALID');
  const scores = valid
    .map((u) => u.rank_score)
    .filter((s): s is number => s !== null && typeof s === 'number' && Number.isFinite(s));
  const averageRating =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const viewer = viewerAccount?.trim();
  let userRating: string | null = null;
  if (viewer) {
    userRating = valid.find((u) => u.creator === viewer)?.value_text ?? null;
  }
  return { averageRating, userRating };
}

/**
 * Maps a resolved field to a presentation value (excluding `object_ref`, handled separately).
 */
export function projectFieldValue(
  field: ResolvedField,
  updateType: string,
  ipfsGatewayBaseUrl: string,
  viewerAccount?: string | null,
): unknown {
  const def = UPDATE_REGISTRY[updateType];
  if (!def || def.value_kind === 'object_ref') {
    return null;
  }

  if (updateType === UPDATE_TYPES.AGGREGATE_RATING) {
    return projectAggregateRatingField(field, viewerAccount);
  }

  const valid = field.values.filter((u) => u.validity_status === 'VALID');

  switch (def.value_kind) {
    case 'text': {
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
        if (updateType === UPDATE_TYPES.IMAGE || updateType === UPDATE_TYPES.IMAGE_BACKGROUND) {
          return pickSingleImageDisplayUrlFromResolvedUpdate(row, ipfsGatewayBaseUrl);
        }
        return row.value_json ?? null;
      }
      if (updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM) {
        return valid
          .map((u) => projectImageGalleryItemJson(u.value_json, ipfsGatewayBaseUrl))
          .filter((x) => x != null);
      }
      return valid.map((u) => u.value_json ?? null);
    }
    default:
      return null;
  }
}
