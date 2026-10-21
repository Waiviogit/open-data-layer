import { Injectable } from '@nestjs/common';
import { VALID_AFFILIATE_GEO } from '@opden-data-layer/core';
import { GeoipLookupService } from './geoip-lookup.service';

const VALID_GEO = new Set<string>(VALID_AFFILIATE_GEO);

@Injectable()
export class CountryResolverService {
  constructor(private readonly geoip: GeoipLookupService) {}

  resolve(clientIp: string | null, override?: string): string | null {
    const trimmed = override?.trim().toUpperCase() ?? '';
    if (trimmed && VALID_GEO.has(trimmed)) {
      return trimmed;
    }
    if (!clientIp) {
      return null;
    }
    return this.geoip.lookup(clientIp)?.countryCode ?? null;
  }
}
