import { DEFAULT_GOVERNANCE_SNAPSHOT } from '@opden-data-layer/objects-domain';
import { AffiliateLinksEnricher } from './affiliate-links.enricher';
import type { AffiliateCodesService } from './affiliate-codes.service';
import type { AffiliateConfig, AffiliateEnrichTarget } from './affiliate.types';
import { GovernanceResolverService } from '../governance';

function config(
  objectId: string,
  scope: 'PERSONAL' | 'GOVERNANCE',
  code: string,
): AffiliateConfig {
  return {
    objectId,
    button: 'https://img/btn.png',
    urlTemplate: 'https://a/$product_id?t=$affiliate_code',
    productIdTypes: ['asin'],
    geoAreas: ['GLOBAL'],
    codes: [{ scope, creator: scope === 'PERSONAL' ? 'alice' : 'gov', codes: [code] }],
  };
}

function target(identifier: unknown): AffiliateEnrichTarget {
  return {
    object_id: 'prod-1',
    object_type: 'product',
    fields: identifier === undefined ? {} : { identifier },
  };
}

describe('AffiliateLinksEnricher', () => {
  afterEach(() => {
    jest.spyOn(Math, 'random').mockRestore();
  });

  function makeEnricher(opts: {
    governance?: AffiliateConfig[];
    personal?: AffiliateConfig[];
  }): AffiliateLinksEnricher {
    const affiliateCodes = {
      getGovernanceConfigs: jest.fn().mockResolvedValue(opts.governance ?? []),
      getPersonalConfigs: jest.fn().mockResolvedValue(opts.personal ?? []),
    } as unknown as AffiliateCodesService;
    const governanceResolver = {
      resolveMergedForObjectView: jest.fn().mockResolvedValue(DEFAULT_GOVERNANCE_SNAPSHOT),
    } as unknown as GovernanceResolverService;
    return new AffiliateLinksEnricher(affiliateCodes, governanceResolver);
  }

  it('prefers PERSONAL over GOVERNANCE for the same object', async () => {
    const enricher = makeEnricher({
      governance: [config('aff-1', 'GOVERNANCE', 'G1')],
      personal: [config('aff-1', 'PERSONAL', 'P1')],
    });
    const row = target([{ value: 'B001', type: 'asin' }]);
    await enricher.enrich([row], {
      countryCode: null,
      personalAccount: 'alice',
    });
    expect(row.affiliateLinks?.[0]?.affiliateCode).toBe('P1');
  });

  it('uses GOVERNANCE when PERSONAL is absent', async () => {
    const enricher = makeEnricher({
      governance: [config('aff-1', 'GOVERNANCE', 'G1')],
    });
    const row = target([{ value: 'B001', type: 'asin' }]);
    await enricher.enrich([row], {
      countryCode: null,
      personalAccount: 'alice',
    });
    expect(row.affiliateLinks?.[0]?.affiliateCode).toBe('G1');
  });

  it('skips a target with no identifier without throwing', async () => {
    const enricher = makeEnricher({
      governance: [config('aff-1', 'GOVERNANCE', 'G1')],
    });
    const row = target(undefined);
    await expect(
      enricher.enrich([row], { countryCode: null }),
    ).resolves.toBeUndefined();
    expect(row.affiliateLinks).toBeUndefined();
  });

  it('does not freeze chance pick across two enrich calls', async () => {
    const weighted: AffiliateConfig = {
      ...config('aff-1', 'GOVERNANCE', 'A::70'),
      codes: [{ scope: 'GOVERNANCE', creator: 'gov', codes: ['A::70', 'B::30'] }],
    };
    const enricher = makeEnricher({ governance: [weighted] });
    const first = target([{ value: 'B001', type: 'asin' }]);
    const second = target([{ value: 'B001', type: 'asin' }]);
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.7);
    await enricher.enrich([first], { countryCode: null });
    await enricher.enrich([second], { countryCode: null });
    expect(first.affiliateLinks?.[0]?.affiliateCode).toBe('A');
    expect(second.affiliateLinks?.[0]?.affiliateCode).toBe('B');
  });

  it('ignores malformed identifier entries', async () => {
    const enricher = makeEnricher({
      governance: [config('aff-1', 'GOVERNANCE', 'G1')],
    });
    const row = target([{ value: 'B001', type: 'asin' }, { foo: 1 }, null]);
    await enricher.enrich([row], { countryCode: null });
    expect(row.affiliateLinks).toHaveLength(1);
    expect(row.affiliateLinks?.[0]?.link).toContain('B001');
  });

  it('never sets affiliateLinks on a recipe even when amazon identifiers match', async () => {
    const enricher = makeEnricher({
      governance: [config('aff-1', 'GOVERNANCE', 'G1')],
    });
    const row: AffiliateEnrichTarget = {
      object_id: 'recipe-1',
      object_type: 'recipe',
      fields: {
        identifier: [
          { value: 'B001', type: 'asin' },
          { type: 'instacart' },
        ],
      },
    };
    await enricher.enrich([row], { countryCode: null });
    expect(row.affiliateLinks).toBeUndefined();
  });
});
