import { isIPv4, isIPv6 } from 'node:net';
import { isForbiddenIPv4, isAllowedPublicHttpsUrl } from './ssrf-guard';

/**
 * Normalize a user string to a canonical `https://...` origin+path for storage.
 * Returns `null` if the value cannot be coerced to a valid https URL.
 */
export function normalizeWebsiteToHttpsUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  let candidate = t;
  if (!/^[a-zA-Z][a-zA-Z+.-]*:\/\//.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return null;
  }
  if (u.protocol === 'http:') {
    u = new URL(u.toString().replace(/^http:/, 'https:'));
  }
  const g = isAllowedPublicHttpsUrl(u);
  if (!g.ok) {
    return null;
  }
  // Reject usernames/passwords
  if (u.username || u.password) {
    return null;
  }
  u.hash = '';
  if (u.pathname === '' || u.pathname === '/') {
    u.pathname = '/';
  }
  return u.toString();
}

/**
 * Re-run guard on final URL after redirects: resolve hostname to check numeric private IP.
 * Best-effort sync DNS is async — this checks only string form. For final URL, parse host.
 */
export function isHostnameSafeAfterRedirect(hostname: string): boolean {
  if (isIPv4(hostname)) {
    const parts = hostname.split('.').map((x) => parseInt(x, 10));
    const n =
      ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
    return !isForbiddenIPv4(n);
  }
  if (isIPv6(hostname)) {
    return false;
  }
  return true;
}
