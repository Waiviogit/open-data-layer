import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { FieldEntry } from './object-create.types';

const DEFAULT_IPFS_GATEWAY = 'https://ipfs.io';

/** Same pattern as query-api `image-display-url`: `{gateway}/ipfs/{cid}`. */
export function ipfsGatewayUrlForCid(
  gatewayBaseUrl: string,
  cid: string,
): string {
  const base = gatewayBaseUrl.replace(/\/+$/, '');
  return `${base}/ipfs/${cid}`;
}

/**
 * Resolves a display URL from an `image` / `imageBackground` form value
 * (`{ url }`, `{ cid }`, or legacy plain URL/CID string).
 */
export function resolvePreviewImageUrl(
  value: unknown,
  gatewayBaseUrl: string = DEFAULT_IPFS_GATEWAY,
): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return ipfsGatewayUrlForCid(gatewayBaseUrl, trimmed);
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
      return ipfsGatewayUrlForCid(gatewayBaseUrl, cid);
    }
  }

  return null;
}

/** Picks the first usable preview image from core/media field rows. */
export function previewImageFromFields(
  fields: readonly FieldEntry[],
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
      const url = resolvePreviewImageUrl(entry.value);
      if (url) {
        return url;
      }
    }
  }
  return null;
}
