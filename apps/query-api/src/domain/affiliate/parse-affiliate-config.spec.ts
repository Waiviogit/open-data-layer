import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { ResolvedObjectView, ResolvedUpdate } from '@opden-data-layer/objects-domain';
import { parseAffiliateConfig } from './parse-affiliate-config';

function update(
  updateType: string,
  overrides: Partial<ResolvedUpdate> = {},
): ResolvedUpdate {
  return {
    update_id: `${updateType}-1`,
    update_type: updateType,
    creator: 'alice',
    locale: null,
    created_at_unix: 1,
    event_seq: BigInt(1),
    value_text: null,
    value_geo: null,
    value_json: null,
    validity_status: 'VALID',
    validity_tier: 'baseline',
    decisive_vote_event_seq: null,
    approve_percent: 100,
    field_weight: null,
    rank_score: null,
    rank_context: null,
    rank_decisive_event_seq: null,
    ...overrides,
  };
}

function field(updateType: string, values: ResolvedUpdate[]): ResolvedObjectView['fields'][string] {
  return { update_type: updateType, cardinality: 'multi', values };
}

function view(fields: ResolvedObjectView['fields']): ResolvedObjectView {
  return {
    object_id: 'aff-1',
    object_type: 'affiliate',
    creator: 'alice',
    weight: null,
    meta_group_id: null,
    status: 'active',
    canonical: null,
    fields,
  };
}

function completeFields(
  extras: Partial<ResolvedObjectView['fields']> = {},
): ResolvedObjectView['fields'] {
  return {
    [UPDATE_TYPES.AFFILIATE_BUTTON]: field(UPDATE_TYPES.AFFILIATE_BUTTON, [
      update(UPDATE_TYPES.AFFILIATE_BUTTON, {
        value_json: { url: 'https://img/btn.png' },
      }),
    ]),
    [UPDATE_TYPES.AFFILIATE_URL_TEMPLATE]: field(UPDATE_TYPES.AFFILIATE_URL_TEMPLATE, [
      update(UPDATE_TYPES.AFFILIATE_URL_TEMPLATE, {
        value_text: 'https://a/$product_id?t=$affiliate_code',
      }),
    ]),
    [UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES]: field(UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES, [
      update(UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES, { value_text: 'asin' }),
    ]),
    [UPDATE_TYPES.AFFILIATE_GEO_AREA]: field(UPDATE_TYPES.AFFILIATE_GEO_AREA, [
      update(UPDATE_TYPES.AFFILIATE_GEO_AREA, { value_text: 'US' }),
    ]),
    [UPDATE_TYPES.AFFILIATE_CODE]: field(UPDATE_TYPES.AFFILIATE_CODE, [
      update(UPDATE_TYPES.AFFILIATE_CODE, {
        creator: 'alice',
        value_json: ['PERSONAL', 'CODE1'],
      }),
    ]),
    ...extras,
  };
}

describe('parseAffiliateConfig', () => {
  it('parses a complete affiliate view into a config', () => {
    const parsed = parseAffiliateConfig(view(completeFields()));
    expect(parsed).toEqual({
      objectId: 'aff-1',
      button: 'https://img/btn.png',
      urlTemplate: 'https://a/$product_id?t=$affiliate_code',
      productIdTypes: ['asin'],
      geoAreas: ['US'],
      codes: [{ scope: 'PERSONAL', creator: 'alice', codes: ['CODE1'] }],
    });
  });

  it('keeps a raw Amazon camelCase url template', () => {
    const amazon =
      'https://www.amazon.fr/dp/$productId/ref=nosim?tag=$affiliateCode';
    const parsed = parseAffiliateConfig(
      view(
        completeFields({
          [UPDATE_TYPES.AFFILIATE_URL_TEMPLATE]: field(
            UPDATE_TYPES.AFFILIATE_URL_TEMPLATE,
            [
              update(UPDATE_TYPES.AFFILIATE_URL_TEMPLATE, {
                value_text: amazon,
              }),
            ],
          ),
        }),
      ),
    );
    expect(parsed?.urlTemplate).toBe(amazon);
  });

  it('does not rewrite a stored snake template', () => {
    const snake = 'https://a/$product_id?t=$affiliate_code';
    const parsed = parseAffiliateConfig(view(completeFields()));
    expect(parsed?.urlTemplate).toBe(snake);
  });

  it('drops an incomplete object missing urlTemplate', () => {
    const fields = completeFields();
    delete fields[UPDATE_TYPES.AFFILIATE_URL_TEMPLATE];
    expect(parseAffiliateConfig(view(fields))).toBeNull();
  });

  it('drops a domain-scoped code entry and returns null when no valid codes remain', () => {
    const fields = completeFields({
      [UPDATE_TYPES.AFFILIATE_CODE]: field(UPDATE_TYPES.AFFILIATE_CODE, [
        update(UPDATE_TYPES.AFFILIATE_CODE, {
          value_json: ['waivio.com', 'X'],
        }),
      ]),
    });
    expect(parseAffiliateConfig(view(fields))).toBeNull();
  });

  it('collects every geo area and product id type', () => {
    const parsed = parseAffiliateConfig(
      view(
        completeFields({
          [UPDATE_TYPES.AFFILIATE_GEO_AREA]: field(UPDATE_TYPES.AFFILIATE_GEO_AREA, [
            update(UPDATE_TYPES.AFFILIATE_GEO_AREA, { value_text: 'US' }),
            update(UPDATE_TYPES.AFFILIATE_GEO_AREA, {
              update_id: 'geo-2',
              value_text: 'CA',
            }),
          ]),
          [UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES]: field(
            UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES,
            [
              update(UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES, { value_text: 'asin' }),
              update(UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES, {
                update_id: 'type-2',
                value_text: 'isbn',
              }),
            ],
          ),
        }),
      ),
    );
    expect(parsed?.geoAreas).toEqual(['US', 'CA']);
    expect(parsed?.productIdTypes).toEqual(['asin', 'isbn']);
  });

  it('drops an incomplete object missing button', () => {
    const fields = completeFields();
    delete fields[UPDATE_TYPES.AFFILIATE_BUTTON];
    expect(parseAffiliateConfig(view(fields))).toBeNull();
  });

  it('resolves a button CID through the content gateway', () => {
    const parsed = parseAffiliateConfig(
      view(
        completeFields({
          [UPDATE_TYPES.AFFILIATE_BUTTON]: field(UPDATE_TYPES.AFFILIATE_BUTTON, [
            update(UPDATE_TYPES.AFFILIATE_BUTTON, {
              value_json: { cid: 'bafyButton' },
            }),
          ]),
        }),
      ),
      { contentBaseUrl: 'https://ipfs.example' },
    );
    expect(parsed?.button).toBe(
      'https://ipfs.example/ipfs-gateway/content/image/bafyButton',
    );
  });

  it('falls back to legacy value_text when json is empty', () => {
    const parsed = parseAffiliateConfig(
      view(
        completeFields({
          [UPDATE_TYPES.AFFILIATE_BUTTON]: field(UPDATE_TYPES.AFFILIATE_BUTTON, [
            update(UPDATE_TYPES.AFFILIATE_BUTTON, {
              value_text: 'https://img/legacy.png',
            }),
          ]),
        }),
      ),
    );
    expect(parsed?.button).toBe('https://img/legacy.png');
  });

  it('returns null when a CID button has no contentBaseUrl', () => {
    expect(
      parseAffiliateConfig(
        view(
          completeFields({
            [UPDATE_TYPES.AFFILIATE_BUTTON]: field(UPDATE_TYPES.AFFILIATE_BUTTON, [
              update(UPDATE_TYPES.AFFILIATE_BUTTON, {
                value_json: { cid: 'bafyButton' },
              }),
            ]),
          }),
        ),
      ),
    ).toBeNull();
  });

  it('drops an incomplete object missing geo', () => {
    const fields = completeFields();
    delete fields[UPDATE_TYPES.AFFILIATE_GEO_AREA];
    expect(parseAffiliateConfig(view(fields))).toBeNull();
  });

  it('keeps the shop owner latest PERSONAL code when curator-rejected', () => {
    const parsed = parseAffiliateConfig(
      view(
        completeFields({
          [UPDATE_TYPES.AFFILIATE_CODE]: field(UPDATE_TYPES.AFFILIATE_CODE, [
            update(UPDATE_TYPES.AFFILIATE_CODE, {
              creator: 'alice',
              validity_status: 'REJECTED',
              created_at_unix: 20,
              event_seq: BigInt(20),
              value_json: ['PERSONAL', '111111'],
            }),
            update(UPDATE_TYPES.AFFILIATE_CODE, {
              update_id: 'code-old',
              creator: 'alice',
              validity_status: 'REJECTED',
              created_at_unix: 10,
              event_seq: BigInt(10),
              approve_percent: 0,
              value_json: ['PERSONAL', 'OLD'],
            }),
          ]),
        }),
      ),
      { personalCreator: 'alice' },
    );
    expect(parsed?.codes).toEqual([{ scope: 'PERSONAL', creator: 'alice', codes: ['111111'] }]);
  });

  it('ignores a rejected PERSONAL code from another creator', () => {
    const parsed = parseAffiliateConfig(
      view(
        completeFields({
          [UPDATE_TYPES.AFFILIATE_CODE]: field(UPDATE_TYPES.AFFILIATE_CODE, [
            update(UPDATE_TYPES.AFFILIATE_CODE, {
              creator: 'bob',
              validity_status: 'REJECTED',
              value_json: ['PERSONAL', 'BOB'],
            }),
          ]),
        }),
      ),
      { personalCreator: 'alice' },
    );
    expect(parsed).toBeNull();
  });

  it('prefers a VALID PERSONAL over a rejected fallback', () => {
    const parsed = parseAffiliateConfig(
      view(
        completeFields({
          [UPDATE_TYPES.AFFILIATE_CODE]: field(UPDATE_TYPES.AFFILIATE_CODE, [
            update(UPDATE_TYPES.AFFILIATE_CODE, {
              creator: 'alice',
              value_json: ['PERSONAL', 'VALID'],
            }),
            update(UPDATE_TYPES.AFFILIATE_CODE, {
              update_id: 'code-rej',
              creator: 'alice',
              validity_status: 'REJECTED',
              created_at_unix: 99,
              event_seq: BigInt(99),
              value_json: ['PERSONAL', 'REJECTED'],
            }),
          ]),
        }),
      ),
      { personalCreator: 'alice' },
    );
    expect(parsed?.codes).toEqual([{ scope: 'PERSONAL', creator: 'alice', codes: ['VALID'] }]);
  });

  it('drops rejected PERSONAL when no shop owner is provided', () => {
    const parsed = parseAffiliateConfig(
      view(
        completeFields({
          [UPDATE_TYPES.AFFILIATE_CODE]: field(UPDATE_TYPES.AFFILIATE_CODE, [
            update(UPDATE_TYPES.AFFILIATE_CODE, {
              creator: 'alice',
              validity_status: 'REJECTED',
              value_json: ['PERSONAL', '111111'],
            }),
          ]),
        }),
      ),
    );
    expect(parsed).toBeNull();
  });
});
