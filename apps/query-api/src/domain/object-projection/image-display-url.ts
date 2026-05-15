import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { JsonValue } from '@opden-data-layer/core';
import type { ResolvedUpdate } from '@opden-data-layer/objects-domain';

/** Same pattern as ipfs-client: `{gateway}/ipfs/{cid}`. */
export function ipfsGatewayUrlForCid(gatewayBaseUrl: string, cid: string): string {
  const base = gatewayBaseUrl.replace(/\/+$/, '');
  return `${base}/ipfs/${cid}`;
}

/** Single resolved row: JSON `{ url }` or `{ cid }`, or legacy `value_text` URL. */
export function pickSingleImageDisplayUrlFromResolvedUpdate(
  row: ResolvedUpdate,
  ipfsGatewayBaseUrl: string,
): string | null {
  const j = row?.value_json;
  if (j != null && typeof j === 'object' && !Array.isArray(j)) {
    const o = j as Record<string, unknown>;
    const url = typeof o.url === 'string' && o.url.trim().length > 0 ? o.url.trim() : null;
    if (url) {
      return url;
    }
    const cid = typeof o.cid === 'string' && o.cid.trim().length > 0 ? o.cid.trim() : null;
    if (cid) {
      return ipfsGatewayUrlForCid(ipfsGatewayBaseUrl, cid);
    }
  }
  const fallback = row?.value_text;
  return typeof fallback === 'string' && fallback.length > 0 ? fallback : null;
}

/**
 * HTTPS URLs for feed card previews (IPFS CID → gateway URL on the server).
 * Covers avatar/cover/gallery-item JSON and optional legacy URL in `imageGallery` text.
 */
export function feedItemImagePreviewUrls(
  updateType: string,
  valueText: string | null,
  valueJson: JsonValue | null,
  ipfsGatewayBaseUrl: string,
): string[] {
  const base =
    ipfsGatewayBaseUrl.trim().length > 0 ? ipfsGatewayBaseUrl : 'https://ipfs.io';

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
      if (cid) {
        return [ipfsGatewayUrlForCid(base, cid)];
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
