import { ConfigService } from '@nestjs/config';
import type { RedisClientFactory } from '@opden-data-layer/clients';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import {
  DEFAULT_GOVERNANCE_SNAPSHOT,
  ObjectViewService,
  type ResolvedObjectView,
  type ResolvedUpdate,
} from '@opden-data-layer/objects-domain';
import { AffiliateCodesService } from './affiliate-codes.service';
import type { AffiliateObjectsRepository } from '../../repositories/affiliate-objects.repository';
import type { AggregatedObjectRepository } from '../../repositories/aggregated-object.repository';

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

function personalView(objectId: string): ResolvedObjectView {
  return {
    object_id: objectId,
    object_type: 'affiliate',
    creator: 'alice',
    weight: null,
    meta_group_id: null,
    status: 'active',
    canonical: null,
    fields: {
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
    },
  };
}

function createService(opts?: {
  findAllActive?: string[] | null;
  findPersonal?: string[] | null;
  personalQueue?: Array<string[] | null>;
  views?: ResolvedObjectView[];
  viewsByCall?: ResolvedObjectView[][];
}) {
  const personalQueue = opts?.personalQueue ? [...opts.personalQueue] : undefined;
  const affiliateObjectsRepo = {
    findAllActiveAffiliateObjectIds: jest
      .fn()
      .mockResolvedValue(opts && 'findAllActive' in opts ? opts.findAllActive : ['aff-1']),
    findObjectIdsForAuthorities: jest.fn(),
    findPersonalObjectIdsForCreator: jest.fn().mockImplementation(() => {
      if (personalQueue) {
        return Promise.resolve(personalQueue.shift() ?? []);
      }
      return Promise.resolve(opts && 'findPersonal' in opts ? opts.findPersonal : []);
    }),
  };
  const viewQueue = opts?.viewsByCall ? [...opts.viewsByCall] : undefined;
  const aggregatedObjectRepo = {
    loadByObjectIds: jest.fn().mockResolvedValue({
      objects: [],
      voterWaivPowers: new Map(),
    }),
  };
  const objectViewService = {
    resolve: jest.fn().mockImplementation(() => {
      if (viewQueue) {
        return viewQueue.shift() ?? [];
      }
      return opts?.views ?? [];
    }),
  };
  const store = new Map<string, string>();
  const redis = {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
  const service = new AffiliateCodesService(
    affiliateObjectsRepo as unknown as AffiliateObjectsRepository,
    aggregatedObjectRepo as unknown as AggregatedObjectRepository,
    objectViewService as unknown as ObjectViewService,
    { getClient: () => redis } as unknown as RedisClientFactory,
    { get: jest.fn().mockReturnValue('gov-1') } as unknown as ConfigService,
  );
  return { service, affiliateObjectsRepo, redis, objectViewService };
}

describe('AffiliateCodesService', () => {
  it('loads all active affiliates when authorities are empty', async () => {
    const { service, affiliateObjectsRepo } = createService({ findAllActive: ['aff-1'] });

    const configs = await service.getGovernanceConfigs({
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      authorities: [],
    });

    expect(configs).toEqual([]);
    expect(affiliateObjectsRepo.findAllActiveAffiliateObjectIds).toHaveBeenCalled();
    expect(affiliateObjectsRepo.findObjectIdsForAuthorities).not.toHaveBeenCalled();
  });

  it('does not cache governance configs when the id lookup fails', async () => {
    const { service, redis } = createService({ findAllActive: null });

    await expect(
      service.getGovernanceConfigs({
        ...DEFAULT_GOVERNANCE_SNAPSHOT,
        authorities: [],
      }),
    ).resolves.toEqual([]);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('does not cache personal configs when the id lookup fails', async () => {
    const { service, redis } = createService({ findPersonal: null });

    await expect(
      service.getPersonalConfigs('alice', DEFAULT_GOVERNANCE_SNAPSHOT, 'site-a'),
    ).resolves.toEqual([]);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('caches a genuine empty governance id list', async () => {
    const { service, redis } = createService({ findAllActive: [] });

    await expect(
      service.getGovernanceConfigs({
        ...DEFAULT_GOVERNANCE_SNAPSHOT,
        authorities: [],
      }),
    ).resolves.toEqual([]);
    expect(redis.set).toHaveBeenCalled();
    expect(JSON.parse(redis.set.mock.calls[0]?.[1] as string)).toEqual([]);
  });

  it('does not reuse personal configs across header governance ids', async () => {
    const { service } = createService({
      personalQueue: [['aff-a'], ['aff-b']],
      viewsByCall: [personalView('aff-a'), personalView('aff-b')].map((v) => [v]),
    });

    const first = await service.getPersonalConfigs(
      'alice',
      DEFAULT_GOVERNANCE_SNAPSHOT,
      'site-a',
    );
    const second = await service.getPersonalConfigs(
      'alice',
      DEFAULT_GOVERNANCE_SNAPSHOT,
      'site-b',
    );

    expect(first.map((c) => c.objectId)).toEqual(['aff-a']);
    expect(second.map((c) => c.objectId)).toEqual(['aff-b']);
  });

  it('reuses personal configs for the same platform and header', async () => {
    const { service, affiliateObjectsRepo } = createService({
      personalQueue: [['aff-1'], ['aff-other']],
      viewsByCall: [personalView('aff-1'), personalView('aff-other')].map((v) => [v]),
    });

    const first = await service.getPersonalConfigs(
      'alice',
      DEFAULT_GOVERNANCE_SNAPSHOT,
      'site-a',
    );
    const second = await service.getPersonalConfigs(
      'alice',
      DEFAULT_GOVERNANCE_SNAPSHOT,
      'site-a',
    );

    expect(first.map((c) => c.objectId)).toEqual(['aff-1']);
    expect(second.map((c) => c.objectId)).toEqual(['aff-1']);
    expect(affiliateObjectsRepo.findPersonalObjectIdsForCreator).toHaveBeenCalledTimes(1);
  });

  it('loads personal views with rejected updates so shop-owner codes survive curator vote', async () => {
    const rejectedPersonal = personalView('aff-1');
    rejectedPersonal.fields[UPDATE_TYPES.AFFILIATE_CODE] = field(UPDATE_TYPES.AFFILIATE_CODE, [
      update(UPDATE_TYPES.AFFILIATE_CODE, {
        creator: 'alice',
        validity_status: 'REJECTED',
        value_json: ['PERSONAL', '111111'],
      }),
    ]);
    const { service, objectViewService } = createService({
      findPersonal: ['aff-1'],
      views: [rejectedPersonal],
    });

    const configs = await service.getPersonalConfigs(
      'alice',
      DEFAULT_GOVERNANCE_SNAPSHOT,
      'site-a',
    );

    expect(configs[0]?.codes).toEqual([
      { scope: 'PERSONAL', creator: 'alice', codes: ['111111'] },
    ]);
    expect(objectViewService.resolve).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ include_rejected: true }),
    );
  });

  it('does not include rejected updates when loading governance configs', async () => {
    const { service, objectViewService } = createService({ findAllActive: ['aff-1'] });

    await service.getGovernanceConfigs({
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      authorities: [],
    });

    expect(objectViewService.resolve).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ include_rejected: false }),
    );
  });
});
