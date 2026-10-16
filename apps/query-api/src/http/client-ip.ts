import type { Request } from 'express';
import { normalizeClientIp } from '../domain/geoip/normalize-client-ip';

export function resolveClientIp(req: Request): string | null {
  return normalizeClientIp(req.ip ?? '');
}
