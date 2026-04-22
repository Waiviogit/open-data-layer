import { isIPv4, isIPv6 } from 'node:net';

const LOCALHOST_NAMES = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * True if the hostname (after URL parse / IDN) is allowed as an SSRF/egress target.
 * Rejects private ranges, link-local, loopback, raw IPs (optional strict), non-http(s).
 */
export function isAllowedPublicHttpsUrl(url: URL): {
  ok: boolean;
  reason?: string;
} {
  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'only_https' };
  }
  const host = url.hostname;
  if (LOCALHOST_NAMES.has(host.toLowerCase()) || host.endsWith('.localhost')) {
    return { ok: false, reason: 'localhost' };
  }
  if (isIPv4(host)) {
    return { ok: false, reason: 'raw_ipv4' };
  }
  if (isIPv6(host)) {
    return { ok: false, reason: 'raw_ipv6' };
  }
  return { ok: true };
}

/** Call after resolution to numeric IP (e.g. DNS) — not used in basic URL string guard. */
export function isForbiddenIPv4(n: number): boolean {
  const a = (n >>> 24) & 0xff;
  const b = (n >>> 16) & 0xff;
  if (a === 10) {
    return true;
  } // 10.0.0.0/8
  if (a === 127) {
    return true;
  } // 127.0.0.0/8
  if (a === 169 && b === 254) {
    return true;
  } // 169.254.0.0/16 link-local
  if (a === 192 && b === 168) {
    return true;
  } // 192.168.0.0/16
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  } // 172.16.0.0/12
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  } // 100.64.0.0/10 (CGN)
  return false;
}
