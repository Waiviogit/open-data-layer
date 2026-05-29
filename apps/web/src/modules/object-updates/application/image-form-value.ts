import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { extractCidFromContentGatewayUrl } from '@/config/ipfs-content-url';

const IMAGE_CID_OR_URL_TYPES = new Set<string>([
  UPDATE_TYPES.IMAGE,
  UPDATE_TYPES.IMAGE_BACKGROUND,
]);

export function isImageCidOrUrlUpdateType(updateType: string): boolean {
  return IMAGE_CID_OR_URL_TYPES.has(updateType);
}

/**
 * Broadcast/storage shape: `{ cid }` for IPFS (including content-gateway display URLs).
 * External HTTPS URLs stay as `{ url }`. Never both fields.
 */
export function normalizeImageCidOrUrlFormValue(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const cid = typeof raw.cid === 'string' ? raw.cid.trim() : '';
  const url = typeof raw.url === 'string' ? raw.url.trim() : '';

  if (cid) {
    return { cid };
  }

  if (url) {
    const gatewayCid = extractCidFromContentGatewayUrl(url);
    if (gatewayCid) {
      return { cid: gatewayCid };
    }
    return { url };
  }

  return {};
}

/** Strip empty fields and normalize before Zod validation / broadcast. */
export function sanitizeImageCidOrUrlFormValue(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const stripped: Record<string, unknown> = { ...raw };
  if (typeof stripped.cid === 'string' && stripped.cid.trim() === '') {
    delete stripped.cid;
  }
  if (typeof stripped.url === 'string' && stripped.url.trim() === '') {
    delete stripped.url;
  }
  return normalizeImageCidOrUrlFormValue(stripped);
}

/** Accept `{ url }` / `{ cid }` objects or plain URL/CID strings as modal prefills. */
export function coerceImageCidOrUrlPrefill(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return sanitizeImageCidOrUrlFormValue(raw as Record<string, unknown>);
  }
  if (typeof raw !== 'string') {
    return raw;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return sanitizeImageCidOrUrlFormValue(parsed as Record<string, unknown>);
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return { url: trimmed };
  }
  return { cid: trimmed };
}
