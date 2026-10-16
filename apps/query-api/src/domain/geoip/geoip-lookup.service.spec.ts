import type { CityResponse } from 'maxmind';
import { GeoipLookupService } from './geoip-lookup.service';
import type { GeoipReaderService } from './geoip-reader.service';

describe('GeoipLookupService', () => {
  function serviceWith(row: CityResponse | null): {
    lookup: GeoipLookupService;
    get: jest.Mock;
  } {
    const get = jest.fn().mockReturnValue(row);
    const lookup = new GeoipLookupService({
      get,
    } as unknown as GeoipReaderService);
    return { lookup, get };
  }

  it('uses country.iso_code when present', () => {
    const { lookup, get } = serviceWith({
      country: { iso_code: 'US' },
      registered_country: { iso_code: 'CA' },
    } as CityResponse);

    expect(lookup.lookup('8.8.8.8')).toEqual({
      countryCode: 'US',
      latitude: null,
      longitude: null,
      accuracyRadiusKm: null,
    });
    expect(get).toHaveBeenCalledWith('8.8.8.8');
  });

  it('falls back to registered_country.iso_code', () => {
    const { lookup } = serviceWith({
      registered_country: { iso_code: 'DE' },
    } as CityResponse);

    expect(lookup.lookup('9.9.9.9')?.countryCode).toBe('DE');
  });

  it('returns null coordinates when location is missing', () => {
    const { lookup } = serviceWith({
      country: { iso_code: 'US' },
    } as CityResponse);

    expect(lookup.lookup('8.8.8.8')).toEqual({
      countryCode: 'US',
      latitude: null,
      longitude: null,
      accuracyRadiusKm: null,
    });
  });

  it('copies location fields when present', () => {
    const { lookup } = serviceWith({
      country: { iso_code: 'US' },
      location: {
        latitude: 37.751,
        longitude: -97.822,
        accuracy_radius: 1000,
      },
    } as CityResponse);

    expect(lookup.lookup('8.8.8.8')).toEqual({
      countryCode: 'US',
      latitude: 37.751,
      longitude: -97.822,
      accuracyRadiusKm: 1000,
    });
  });

  it('returns null when the reader has no row', () => {
    const { lookup } = serviceWith(null);
    expect(lookup.lookup('8.8.8.8')).toBeNull();
  });

  it('returns null for an invalid IP without requiring a reader hit', () => {
    const { lookup, get } = serviceWith({
      country: { iso_code: 'US' },
    } as CityResponse);
    expect(lookup.lookup('not-an-ip')).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('maps missing country fields to null countryCode', () => {
    const { lookup } = serviceWith({
      location: {
        latitude: 1,
        longitude: 2,
        accuracy_radius: 5,
      },
    } as CityResponse);

    expect(lookup.lookup('8.8.8.8')).toEqual({
      countryCode: null,
      latitude: 1,
      longitude: 2,
      accuracyRadiusKm: 5,
    });
  });
});
