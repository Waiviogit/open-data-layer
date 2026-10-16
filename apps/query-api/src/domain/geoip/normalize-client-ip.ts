import { isIP } from 'node:net';
import { IPV4_MAPPED_PREFIX } from './geoip.constants';

export function normalizeClientIp(ip: string): string | null {
  const trimmed = ip.trim();
  if (!trimmed) {
    return null;
  }
  const v = trimmed.startsWith(IPV4_MAPPED_PREFIX)
    ? trimmed.slice(IPV4_MAPPED_PREFIX.length)
    : trimmed;
  return isIP(v) ? v : null;
}
