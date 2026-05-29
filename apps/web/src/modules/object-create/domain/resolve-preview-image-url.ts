import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { imageContentUrlForCid } from '@/config/ipfs-content-url';

import type { FieldEntry } from './object-create.types';

function cidToPreviewUrl(cid: string, contentBaseUrl: string): string | null {
  const base = contentBaseUrl.trim();
  if (!base) {
    return null;
  }
  return imageContentUrlForCid(base, cid);
}

/**
 * Resolves a display URL from an `image` / `imageBackground` form value
 * (`{ url }`, `{ cid }`, or legacy plain URL/CID string).
 */
export function resolvePreviewImageUrl(
  value: unknown,
  contentBaseUrl: string,
): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return cidToPreviewUrl(trimmed, contentBaseUrl);
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    const url =
      typeof o.url === 'string' && o.url.trim().length > 0 ? o.url.trim() : null;
    if (url) {
      return url;
    }
    const cid =
      typeof o.cid === 'string' && o.cid.trim().length > 0 ? o.cid.trim() : null;
    if (cid) {
      return cidToPreviewUrl(cid, contentBaseUrl);
    }
  }

  return null;
}

/** Picks the first usable preview image from core/media field rows. */
export function previewImageFromFields(
  fields: readonly FieldEntry[],
  contentBaseUrl: string,
): string | null {
  const types = [
    UPDATE_TYPES.IMAGE,
    UPDATE_TYPES.IMAGE_BACKGROUND,
    UPDATE_TYPES.IMAGE_GALLERY_ITEM,
  ];
  for (const type of types) {
    for (const entry of fields) {
      if (entry.updateType !== type) {
        continue;
      }
      const url = resolvePreviewImageUrl(entry.value, contentBaseUrl);
      if (url) {
        return url;
      }
    }
  }
  return null;
}
