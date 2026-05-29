import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { JsonValue } from '@opden-data-layer/core';
import type { ResolvedUpdate } from '@opden-data-layer/objects-domain';

/** `{IPFS_CONTENT_BASE_URL}/ipfs-gateway/content/image/{cid}` */
export function imageContentUrlForCid(contentBaseUrl: string, cid: string): string {
  const base = contentBaseUrl.replace(/\/+$/, '');
  return `${base}/ipfs-gateway/content/image/${cid}`;
}

/** Single resolved row: JSON `{ url }` or `{ cid }`, or legacy `value_text` URL. */
export function pickSingleImageDisplayUrlFromResolvedUpdate(
  row: ResolvedUpdate,
  contentBaseUrl: string | undefined,
): string | null {
  const j = row?.value_json;
  if (j != null && typeof j === 'object' && !Array.isArray(j)) {
    const o = j as Record<string, unknown>;
    const url = typeof o.url === 'string' && o.url.trim().length > 0 ? o.url.trim() : null;
    if (url) {
      return url;
    }
    const cid = typeof o.cid === 'string' && o.cid.trim().length > 0 ? o.cid.trim() : null;
    if (cid && contentBaseUrl?.trim()) {
      return imageContentUrlForCid(contentBaseUrl.trim(), cid);
    }
  }
  const fallback = row?.value_text;
  return typeof fallback === 'string' && fallback.length > 0 ? fallback : null;
}

/**
 * HTTPS URLs for feed card previews (IPFS CID → content gateway URL on the server).
 * Covers avatar/cover/gallery-item JSON and optional legacy URL in `imageGallery` text.
 */
export function feedItemImagePreviewUrls(
  updateType: string,
  valueText: string | null,
  valueJson: JsonValue | null,
  contentBaseUrl: string | undefined,
): string[] {
  const base = contentBaseUrl?.trim();

  if (updateType === UPDATE_TYPES.IMAGE || updateType === UPDATE_TYPES.IMAGE_BACKGROUND) {
    const url = pickSingleImageDisplayUrlFromResolvedUpdate(
      { value_text: valueText, value_json: valueJson } as ResolvedUpdate,
      base,
    );
    return url ? [url] : [];
  }

  if (updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM) {
    if (valueJson != null && typeof valueJson === 'object' && !Array.isArray(valueJson)) {
      const o = valueJson as Record<string, unknown>;
      const url = typeof o.url === 'string' && o.url.trim().length > 0 ? o.url.trim() : null;
      if (url) {
        return [url];
      }
      const cid = typeof o.cid === 'string' && o.cid.trim().length > 0 ? o.cid.trim() : null;
      if (cid && base) {
        return [imageContentUrlForCid(base, cid)];
      }
    }
    return [];
  }

  if (updateType === UPDATE_TYPES.IMAGE_GALLERY) {
    const t = valueText?.trim() ?? '';
    if (t.startsWith('http://') || t.startsWith('https://')) {
      return [t];
    }
    return [];
  }

  return [];
}
