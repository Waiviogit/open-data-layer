import type { AffiliateConfig } from './affiliate.types';
import { buildAffiliateLinks } from './build-affiliate-links';

function config(overrides: Partial<AffiliateConfig> & Pick<AffiliateConfig, 'objectId'>): AffiliateConfig {
  return {
    button: 'https://img/btn.png',
    urlTemplate: 'https://a/$product_id?t=$affiliate_code',
    productIdTypes: ['asin'],
    geoAreas: ['US'],
    codes: [{ scope: 'GOVERNANCE', creator: 'gov', codes: ['AFF1'] }],
    ...overrides,
  };
}

describe('buildAffiliateLinks', () => {
  it('builds an exact-match link for a matching product id type', () => {
    const links = buildAffiliateLinks(
      [
        config({
          objectId: 'aff-1',
          geoAreas: ['US'],
          urlTemplate: 'https://a/asin/$product_id?t=$affiliate_code',
        }),
      ],
      [{ productId: 'B001', productIdType: 'asin' }],
      'US',
    );
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      link: 'https://a/asin/B001?t=AFF1',
      type: 'asin',
      objectId: 'aff-1',
      affiliateCode: 'AFF1',
    });
  });

  it('does not exact-match a none or null product id', () => {
    const configs = [
      config({
        objectId: 'aff-1',
        urlTemplate: 'https://a/asin/$product_id?t=$affiliate_code',
      }),
    ];
    expect(
      buildAffiliateLinks(configs, [{ productId: 'none', productIdType: 'asin' }], 'US'),
    ).toEqual([]);
    expect(
      buildAffiliateLinks(configs, [{ productId: 'null', productIdType: 'asin' }], 'US'),
    ).toEqual([]);
  });

  it('prefers country geo over continent over GLOBAL', () => {
    const links = buildAffiliateLinks(
      [
        config({ objectId: 'aff-us', geoAreas: ['US'] }),
        config({ objectId: 'aff-na', geoAreas: ['NORTH AMERICA'] }),
        config({ objectId: 'aff-g', geoAreas: ['GLOBAL'] }),
      ],
      [{ productId: 'B001', productIdType: 'asin' }],
      'US',
    );
    expect(links).toHaveLength(1);
    expect(links[0]?.objectId).toBe('aff-us');
  });

  it('falls back to continent when country is absent', () => {
    const links = buildAffiliateLinks(
      [
        config({ objectId: 'aff-eu', geoAreas: ['EUROPE'] }),
        config({ objectId: 'aff-g', geoAreas: ['GLOBAL'] }),
      ],
      [{ productId: 'B001', productIdType: 'asin' }],
      'DE',
    );
    expect(links[0]?.objectId).toBe('aff-eu');
  });

  it('falls back to GLOBAL when country and continent are absent', () => {
    const links = buildAffiliateLinks(
      [config({ objectId: 'aff-g', geoAreas: ['GLOBAL'] })],
      [{ productId: 'B001', productIdType: 'asin' }],
      'DE',
    );
    expect(links[0]?.objectId).toBe('aff-g');
  });

  it('substitutes Amazon camelCase placeholders', () => {
    const links = buildAffiliateLinks(
      [
        config({
          objectId: 'aff-amazon',
          urlTemplate:
            'https://www.amazon.fr/dp/$productId/ref=nosim?tag=$affiliateCode',
        }),
      ],
      [{ productId: 'B001', productIdType: 'asin' }],
      'US',
    );
    expect(links).toHaveLength(1);
    expect(links[0]?.link).toBe(
      'https://www.amazon.fr/dp/B001/ref=nosim?tag=AFF1',
    );
  });

  it('substitutes both new and legacy placeholders', () => {
    const links = buildAffiliateLinks(
      [
        config({
          objectId: 'aff-new',
          urlTemplate: 'https://a/$product_id?t=$affiliate_code',
          productIdTypes: ['asin'],
        }),
        config({
          objectId: 'aff-legacy',
          urlTemplate: 'https://b/$productId?t=$affiliateCode',
          productIdTypes: ['isbn'],
        }),
      ],
      [
        { productId: 'B001', productIdType: 'asin' },
        { productId: '9780', productIdType: 'isbn' },
      ],
      'US',
    );
    expect(links.map((l) => l.link).sort()).toEqual([
      'https://a/B001?t=AFF1',
      'https://b/9780?t=AFF1',
    ]);
  });

  it('still yields GLOBAL links when country is null', () => {
    const links = buildAffiliateLinks(
      [config({ objectId: 'aff-g', geoAreas: ['GLOBAL'] })],
      [{ productId: 'B001', productIdType: 'asin' }],
      null,
    );
    expect(links).toHaveLength(1);
    expect(links[0]?.objectId).toBe('aff-g');
  });

  it('uses GLOBAL when country has no continent map', () => {
    const links = buildAffiliateLinks(
      [config({ objectId: 'aff-g', geoAreas: ['GLOBAL'] })],
      [{ productId: 'B001', productIdType: 'asin' }],
      'XX',
    );
    expect(links[0]?.objectId).toBe('aff-g');
  });

  it('pools codes from every GOVERNANCE entry on one config', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.6);
    const links = buildAffiliateLinks(
      [
        config({
          objectId: 'aff-1',
          codes: [
            { scope: 'GOVERNANCE', creator: 'gov', codes: ['AFF1'] },
            { scope: 'GOVERNANCE', creator: 'gov', codes: ['AFF2'] },
          ],
        }),
      ],
      [{ productId: 'B001', productIdType: 'asin' }],
      'US',
    );
    expect(links).toHaveLength(1);
    expect(links[0]?.affiliateCode).toBe('AFF2');
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('still uses the only GOVERNANCE entry when there is one', () => {
    const links = buildAffiliateLinks(
      [config({ objectId: 'aff-1' })],
      [{ productId: 'B001', productIdType: 'asin' }],
      'US',
    );
    expect(links).toHaveLength(1);
    expect(links[0]?.affiliateCode).toBe('AFF1');
  });

  it('emits one config for overlapping product-id-type groups', () => {
    const links = buildAffiliateLinks(
      [
        config({ objectId: 'aff-1', geoAreas: ['US'] }),
        config({ objectId: 'aff-2', geoAreas: ['US'] }),
      ],
      [{ productId: 'B001', productIdType: 'asin' }],
      'US',
    );
    expect(links).toHaveLength(1);
  });
});
