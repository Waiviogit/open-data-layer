import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { AggregatedObject } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { DEFAULT_GOVERNANCE_SNAPSHOT } from '@opden-data-layer/objects-domain';
import type { AggregatedObjectRepository } from '../../repositories';
import {
  ListItemsRecursiveCountService,
  winningListItemRefIds,
} from './list-items-recursive-count.service';

function agg(objectId: string, objectType: string): AggregatedObject {
  return {
    core: {
      object_id: objectId,
      object_type: objectType,
      creator: 'c',
      weight: null,
      meta_group_id: null,
      canonical: null,
      status: 'active',
    } as AggregatedObject['core'],
    updates: [],
    validity_votes: [],
    authorities: [],
  };
}

function listView(objectId: string, childIds: string[]): ResolvedObjectView {
  return {
    object_id: objectId,
    object_type: 'list',
    creator: 'c',
    weight: null,
    meta_group_id: null,
    canonical: null,
    fields: {
      [UPDATE_TYPES.LIST_ITEM]: {
        update_type: UPDATE_TYPES.LIST_ITEM,
        cardinality: 'multi',
        values: childIds.map((id, i) => ({
          update_id: `u-${i}`,
          update_type: UPDATE_TYPES.LIST_ITEM,
          creator: 'c',
          locale: null,
          created_at_unix: 1,
          event_seq: BigInt(i),
          value_text: id,
          value_geo: null,
          value_json: null,
          validity_status: 'VALID' as const,
          validity_tier: null,
          decisive_vote_event_seq: null,
          approve_percent: 100,
          field_weight: null,
          rank_score: null,
          rank_context: null,
          rank_decisive_event_seq: null,
        })),
      },
    },
  };
}

describe('winningListItemRefIds', () => {
  it('deduplicates VALID listItem refs by value_text', () => {
    const ids = winningListItemRefIds(listView('parent', ['a', 'a', 'b']));
    expect(ids).toEqual(['a', 'b']);
  });
});

describe('ListItemsRecursiveCountService', () => {
  const redis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  };
  const redisFactory = {
    getClient: () => redis,
  } as unknown as import('@opden-data-layer/clients').RedisClientFactory;

  beforeEach(() => {
    redis.get.mockClear();
    redis.set.mockClear();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');
  });

  it('sums recursive leaf counts for nested lists', async () => {
    const treeIds = [
      'appetizers',
      'dips',
      'finger',
      'street',
      'leaf-1',
      'leaf-2',
      'leaf-3',
    ];
    const repo = {
      loadListTreeIdsByRoots: jest.fn(async (roots: string[]) => {
        const m = new Map<string, string[]>();
        for (const root of roots) {
          m.set(root, treeIds);
        }
        return m;
      }),
      loadForListCount: jest.fn(async (ids: string[]) => ({
        objects: ids.map((id) => agg(id, 'list')),
        voterWaivPowers: new Map(),
      })),
    } as unknown as AggregatedObjectRepository;

    const viewService = {
      resolve: jest.fn((objects: AggregatedObject[]) => {
        const id = objects[0]!.core.object_id;
        if (id === 'appetizers') {
          return [listView(id, ['dips', 'finger', 'street'])];
        }
        if (id === 'dips') {
          return [listView(id, ['leaf-1', 'leaf-2'])];
        }
        if (id === 'finger') {
          return [listView(id, ['leaf-3'])];
        }
        if (id === 'street') {
          return [listView(id, [])];
        }
        return [listView(id, [])];
      }),
    } as unknown as ObjectViewService;

    const service = new ListItemsRecursiveCountService(repo, viewService, redisFactory);
    const counts = await service.countForListRefIds(['appetizers'], {
      parentObjectId: 'recipes',
      governance: DEFAULT_GOVERNANCE_SNAPSHOT,
      locale: 'en-US',
    });

    // dips: 2 leaves, finger: 1 leaf, street: empty nested list counts as 1
    expect(counts.get('appetizers')).toBe(4);
    expect(redis.set).toHaveBeenCalled();
  });

  it('returns 1 for non-list objects', async () => {
    const repo = {
      loadListTreeIdsByRoots: jest.fn(async (roots: string[]) => {
        const m = new Map<string, string[]>();
        for (const root of roots) {
          m.set(root, [root]);
        }
        return m;
      }),
      loadForListCount: jest.fn(async (ids: string[]) => ({
        objects: ids.map((id) =>
          id === 'product-1' ? agg('product-1', 'product') : agg(id, 'list'),
        ),
        voterWaivPowers: new Map(),
      })),
    } as unknown as AggregatedObjectRepository;

    const viewService = { resolve: jest.fn(() => []) } as unknown as ObjectViewService;
    const service = new ListItemsRecursiveCountService(repo, viewService, redisFactory);
    const counts = await service.countForListRefIds(['product-1'], {
      parentObjectId: 'parent',
      governance: DEFAULT_GOVERNANCE_SNAPSHOT,
      locale: 'en-US',
    });
    expect(counts.get('product-1')).toBe(1);
  });
});
