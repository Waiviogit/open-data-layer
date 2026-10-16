import { Injectable } from '@nestjs/common';
import { GeoipReaderService } from './geoip-reader.service';
import type { GeoLookup } from './geoip.types';
import { normalizeClientIp } from './normalize-client-ip';

@Injectable()
export class GeoipLookupService {
  constructor(private readonly reader: GeoipReaderService) {}

  lookup(rawIp: string): GeoLookup | null {
    const ip = normalizeClientIp(rawIp);
    if (!ip) {
      return null;
    }
    const row = this.reader.get(ip);
    if (!row) {
      return null;
    }
    return {
      countryCode:
        row.country?.iso_code ?? row.registered_country?.iso_code ?? null,
      latitude: row.location?.latitude ?? null,
      longitude: row.location?.longitude ?? null,
      accuracyRadiusKm: row.location?.accuracy_radius ?? null,
    };
  }
}
