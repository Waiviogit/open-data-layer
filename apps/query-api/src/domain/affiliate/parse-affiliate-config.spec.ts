import { AFFILIATE_CODE_SCOPE, UPDATE_TYPES } from '@opden-data-layer/core';
import {
  DEFAULT_GOVERNANCE_SNAPSHOT,
  resolveObjectViews,
  type ResolvedObjectView,
  type ResolvedUpdate,
} from '@opden-data-layer/objects-domain';
import type {
  ObjectOwnership,
  ObjectUpdate,
  ObjectsCore,
  ValidityVote,
} from '@opden-data-layer/odl-db-types';
import { filterConfigsByScope, parseAffiliateConfig } from './parse-affiliate-config';

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

const AFFILIATE_UPDATE_TYPES = [
  UPDATE_TYPES.AFFILIATE_BUTTON,
  UPDATE_TYPES.AFFILIATE_URL_TEMPLATE,
  UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES,
  UPDATE_TYPES.AFFILIATE_GEO_AREA,
  UPDATE_TYPES.AFFILIATE_CODE,
];

const DXL_GOVERNANCE = {
  ...DEFAULT_GOVERNANCE_SNAPSHOT,
  admins: ['waivio'],
  authorities: ['waivio.affiliate'],
};

function makeCore(objectId: string): ObjectsCore {
  return {
    object_id: objectId,
    object_type: 'affiliate',
    creator: 'waivio.affiliate',
    weight: null,
    meta_group_id: null,
    canonical: null,
    canonical_creator: null,
    transaction_id: 'tx1',
    status: 'active',
    seq: 1,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
  };
}

function makeOwnership(
  objectId: string,
  account: string,
): ObjectOwnership {
  return {
    object_id: objectId,
    account,
    ownership_type: 'exclusive',
    event_seq: BigInt(1),
    created_at: new Date(),
  };
}

function makeUpdate(
  objectId: string,
  updateType: string,
  overrides: Partial<ObjectUpdate> = {},
): ObjectUpdate {
  return {
    update_id: `${objectId}-${updateType}`,
    object_id: objectId,
    update_type: updateType,
    creator: 'waivio.affiliate',
    locale: null,
    created_at_unix: 1000,
    event_seq: BigInt(1),
    transaction_id: 'tx1',
    value_text: null,
    value_geo: null,
    value_json: null,
    value_text_normalized: null,
    search_vector: null,
    rank_score: null,
    rank_context: null,
    rank_decisive_event_seq: null,
    ...overrides,
  };
}

function makeVote(
  updateId: string,
  voter: string,
  vote: 'for' | 'against',
  eventSeq = BigInt(10),
): ValidityVote {
  return {
    update_id: updateId,
    object_id: updateId.split('-')[0] ?? 'obj',
    voter,
    vote,
    event_seq: eventSeq,
    transaction_id: 'tx-vote',
  };
}

const DXL_TEMPLATE = 'https://www.amazon.com/dp/$productId/ref=nosim?tag=$affiliateCode';
const UKW_TEMPLATE = 'https://www.amazon.ca/dp/$productId/ref=nosim?tag=$affiliateCode';

function dxlConfigFields(objectId: string): ObjectUpdate[] {
  return [
    makeUpdate(objectId, UPDATE_TYPES.AFFILIATE_BUTTON, {
      value_json: { url: 'https://img/amazon.png' },
    }),
    makeUpdate(objectId, UPDATE_TYPES.AFFILIATE_URL_TEMPLATE, {
      value_text: DXL_TEMPLATE,
    }),
    makeUpdate(objectId, UPDATE_TYPES.AFFILIATE_GEO_AREA, {
      value_text: 'GLOBAL',
    }),
    makeUpdate(objectId, UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES, {
      value_text: 'asin',
    }),
    makeUpdate(objectId, UPDATE_TYPES.AFFILIATE_CODE, {
      value_json: ['GOVERNANCE', 'waivious-20'],
    }),
  ];
}

function waivioForVotes(updates: ObjectUpdate[]): ValidityVote[] {
  return updates
    .filter((u) => u.update_type !== UPDATE_TYPES.AFFILIATE_CODE)
    .map((u) => makeVote(u.update_id, 'waivio', 'for'));
}

function resolveAffiliate(
  objectId: string,
  updates: ObjectUpdate[],
  votes: ValidityVote[],
  ownerships: ObjectOwnership[],
  includeRejected = false,
): ResolvedObjectView {
  const views = resolveObjectViews(
    [
      {
        core: makeCore(objectId),
        updates,
        validity_votes: votes,
        favorites: [],
        ownerships,
      },
    ],
    new Map(),
    {
      locale: 'en-US',
      update_types: AFFILIATE_UPDATE_TYPES,
      governance: DXL_GOVERNANCE,
      include_rejected: includeRejected,
    },
  );
  if (views[0] == null) {
    throw new Error('expected resolved affiliate view');
  }
  return views[0];
}

describe('parseAffiliateConfig after objects-domain resolve', () => {
  const dxlId = 'dxl-amazon-com';
  const dxlOwnerships = [
    makeOwnership(dxlId, 'waivio'),
    makeOwnership(dxlId, 'wiv01'),
    makeOwnership(dxlId, 'waivio.affiliate'),
  ];

  it('produces a GOVERNANCE config from an authority-created code without an admin vote', () => {
    const updates = dxlConfigFields(dxlId);
    const codeId = `${dxlId}-${UPDATE_TYPES.AFFILIATE_CODE}`;
    const votes = [
      ...waivioForVotes(updates),
      makeVote(codeId, 'waivio.affiliate', 'for'),
    ];
    const parsed = parseAffiliateConfig(resolveAffiliate(dxlId, updates, votes, dxlOwnerships));
    const configs = filterConfigsByScope(parsed ? [parsed] : [], AFFILIATE_CODE_SCOPE.GOVERNANCE);
    expect(configs).toHaveLength(1);
    expect(configs[0].codes).toEqual([
      { scope: 'GOVERNANCE', creator: 'waivio.affiliate', codes: ['waivious-20'] },
    ]);
    expect(configs[0].geoAreas).toEqual(['GLOBAL']);
    expect(configs[0].productIdTypes).toContain('asin');
    expect(configs[0].urlTemplate).toBe(DXL_TEMPLATE);
  });

  it('still produces the CA GOVERNANCE config when the authority is the only exclusive owner', () => {
    const ukwId = 'ukw-amazon-ca';
    const updates = [
      makeUpdate(ukwId, UPDATE_TYPES.AFFILIATE_BUTTON, {
        value_json: { url: 'https://img/amazon-ca.png' },
      }),
      makeUpdate(ukwId, UPDATE_TYPES.AFFILIATE_URL_TEMPLATE, {
        value_text: UKW_TEMPLATE,
      }),
      makeUpdate(ukwId, UPDATE_TYPES.AFFILIATE_GEO_AREA, {
        value_text: 'CA',
      }),
      makeUpdate(ukwId, UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES, {
        value_text: 'amazon.ca',
      }),
      makeUpdate(ukwId, UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES, {
        update_id: `${ukwId}-asin`,
        value_text: 'asin',
        event_seq: BigInt(2),
      }),
      makeUpdate(ukwId, UPDATE_TYPES.AFFILIATE_CODE, {
        value_json: ['GOVERNANCE', 'waiviocan-20'],
      }),
    ];
    const parsed = parseAffiliateConfig(
      resolveAffiliate(ukwId, updates, [], [makeOwnership(ukwId, 'waivio.affiliate')]),
    );
    const configs = filterConfigsByScope(parsed ? [parsed] : [], AFFILIATE_CODE_SCOPE.GOVERNANCE);
    expect(configs).toHaveLength(1);
    expect(configs[0].codes).toEqual([
      { scope: 'GOVERNANCE', creator: 'waivio.affiliate', codes: ['waiviocan-20'] },
    ]);
    expect(configs[0].geoAreas).toEqual(['CA']);
    expect(configs[0].productIdTypes).toEqual(expect.arrayContaining(['amazon.ca', 'asin']));
  });

  it('drops the GOVERNANCE config when the authority later votes against the code', () => {
    const updates = dxlConfigFields(dxlId);
    const codeId = `${dxlId}-${UPDATE_TYPES.AFFILIATE_CODE}`;
    const votes = [
      ...waivioForVotes(updates),
      makeVote(codeId, 'waivio.affiliate', 'for', BigInt(1)),
      makeVote(codeId, 'waivio.affiliate', 'against', BigInt(2)),
    ];
    const parsed = parseAffiliateConfig(resolveAffiliate(dxlId, updates, votes, dxlOwnerships));
    expect(filterConfigsByScope(parsed ? [parsed] : [], AFFILIATE_CODE_SCOPE.GOVERNANCE)).toEqual([]);
  });

  it('keeps the shop owner PERSONAL code after the curator rejects it', () => {
    const updates = [
      ...dxlConfigFields(dxlId),
      makeUpdate(dxlId, UPDATE_TYPES.AFFILIATE_CODE, {
        update_id: `${dxlId}-personal`,
        creator: 'wiv01',
        created_at_unix: 2000,
        event_seq: BigInt(20),
        value_json: ['PERSONAL', 'wiv01-20'],
      }),
    ];
    const codeId = `${dxlId}-${UPDATE_TYPES.AFFILIATE_CODE}`;
    const votes = [
      ...waivioForVotes(updates),
      makeVote(codeId, 'waivio.affiliate', 'for'),
    ];
    const parsed = parseAffiliateConfig(
      resolveAffiliate(dxlId, updates, votes, dxlOwnerships, true),
      { personalCreator: 'wiv01' },
    );
    const configs = filterConfigsByScope(
      parsed ? [parsed] : [],
      AFFILIATE_CODE_SCOPE.PERSONAL,
      'wiv01',
    );
    expect(configs).toHaveLength(1);
    expect(configs[0].codes).toEqual([
      { scope: 'PERSONAL', creator: 'wiv01', codes: ['wiv01-20'] },
    ]);
  });
});
