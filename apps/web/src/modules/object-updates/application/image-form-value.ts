import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

const IMAGE_CID_OR_URL_TYPES = new Set<string>([
  UPDATE_TYPES.IMAGE,
  UPDATE_TYPES.IMAGE_BACKGROUND,
]);

export function isImageCidOrUrlUpdateType(updateType: string): boolean {
  return IMAGE_CID_OR_URL_TYPES.has(updateType);
}

/** Strip empty optional image fields before Zod validation. */
export function sanitizeImageCidOrUrlFormValue(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  if (typeof out.cid === 'string' && out.cid.trim() === '') {
    delete out.cid;
  }
  if (typeof out.url === 'string' && out.url.trim() === '') {
    delete out.url;
  }
  return out;
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
