/**
 * Returns true when `urlString` is a safe external navigation target (http/https only).
 * Rejects javascript:, data:, vbscript:, and other non-http(s) schemes.
 */
export function isSafeHttpUrl(urlString: string): boolean {
  const trimmed = urlString.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Normalized http(s) URL string, or null when unsafe / invalid. */
export function safeHttpUrl(urlString: string): string | null {
  const trimmed = urlString.trim();
  if (!isSafeHttpUrl(trimmed)) {
    return null;
  }
  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}
