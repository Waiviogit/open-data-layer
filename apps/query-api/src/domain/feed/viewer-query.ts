/** Same character set as Hive account in path params (OpenAPI `author`). */
const VIEWER_ACCOUNT_PATTERN = /^[a-zA-Z0-9.-]+$/;

/**
 * Optional `viewer` query: Hive account viewing the post (for administrative heart on linked objects).
 * Returns `undefined` when absent or invalid (invalid values are ignored, not rejected).
 */
export function parseOptionalViewerQuery(raw: string | string[] | undefined): string | undefined {
  if (raw == null) {
    return undefined;
  }
  const s = Array.isArray(raw) ? raw[0] : raw;
  const t = s.trim();
  if (t.length === 0 || t.length > 32 || !VIEWER_ACCOUNT_PATTERN.test(t)) {
    return undefined;
  }
  return t;
}
