import { VALID_AFFILIATE_GEO } from './affiliate.constants';
import {
  AFFILIATE_GEO_CONTINENT_ORDER,
  AFFILIATE_GEO_LABELS,
  affiliateGeoSelectOptions,
} from './affiliate-geo-labels';

describe('AFFILIATE_GEO_LABELS', () => {
  it('covers every VALID_AFFILIATE_GEO code', () => {
    for (const code of VALID_AFFILIATE_GEO) {
      expect(AFFILIATE_GEO_LABELS[code]).toEqual(expect.any(String));
      expect(AFFILIATE_GEO_LABELS[code].length).toBeGreaterThan(0);
    }
  });
});

describe('affiliateGeoSelectOptions', () => {
  const options = affiliateGeoSelectOptions();

  it('starts with continents in legacy order', () => {
    expect(options.slice(0, AFFILIATE_GEO_CONTINENT_ORDER.length).map((o) => o.value)).toEqual(
      [...AFFILIATE_GEO_CONTINENT_ORDER],
    );
  });

  it('lists every enum value exactly once and no extras', () => {
    const values = options.map((o) => o.value);
    expect(values).toHaveLength(VALID_AFFILIATE_GEO.length);
    expect(new Set(values).size).toBe(VALID_AFFILIATE_GEO.length);
    expect(new Set(values)).toEqual(new Set(VALID_AFFILIATE_GEO));
  });

  it('uses the English label while keeping the stored code', () => {
    expect(options.find((o) => o.value === 'US')).toEqual({
      value: 'US',
      label: 'United States of America',
    });
    expect(options.find((o) => o.value === 'EUROPE')).toEqual({
      value: 'EUROPE',
      label: 'Europe',
    });
    expect(options.find((o) => o.value === 'GLOBAL')).toEqual({
      value: 'GLOBAL',
      label: 'Global',
    });
  });
});
