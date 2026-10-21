import { CountryResolverService } from './country-resolver.service';
import type { GeoipLookupService } from './geoip-lookup.service';

describe('CountryResolverService', () => {
  function make(geoCountry: string | null): CountryResolverService {
    return new CountryResolverService({
      lookup: jest.fn().mockReturnValue(geoCountry ? { countryCode: geoCountry } : null),
    } as unknown as GeoipLookupService);
  }

  it('lets a valid country override beat GeoIP', () => {
    expect(make('DE').resolve('1.1.1.1', 'us')).toBe('US');
  });

  it('falls back to GeoIP when the override is invalid', () => {
    expect(make('FR').resolve('1.1.1.1', 'ZZZ')).toBe('FR');
    expect(make('FR').resolve('1.1.1.1', 'us-west')).toBe('FR');
  });

  it('uses GeoIP when the override is empty or omitted', () => {
    expect(make('IT').resolve('1.1.1.1', '')).toBe('IT');
    expect(make('IT').resolve('1.1.1.1')).toBe('IT');
  });
});
