import type { ObjectsCore } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AccountsCurrentRepository,
  AggregatedObjectRepository,
  UserObjectFollowsRepository,
} from '../../repositories';
import type { ProjectedObject } from '../object-projection';
import { ObjectProjectionService } from '../object-projection';
import { emptyRankVoteProjection } from '../object-projection/projected-object.types';
import type { UserFollowingObjectsQuery } from './user-social-list.schema';
import { GetUserFollowingObjectsEndpoint } from './get-user-following-objects.endpoint';

describe('GetUserFollowingObjectsEndpoint', () => {
  const query: UserFollowingObjectsQuery = { sort: 'weight', skip: 0, limit: 10 };

  it('returns null when profile missing', async () => {
    const accounts = { findByName: jest.fn().mockResolvedValue(null) } as unknown as AccountsCurrentRepository;
    const deps = stubDeps();

    const endpoint = new GetUserFollowingObjectsEndpoint(
      accounts,
      deps.objectFollows,
      deps.aggregatedObjectRepo,
      deps.objectViewService,
      deps.objectProjection,
    );

    await expect(endpoint.execute('x', query, 'en-US', undefined, undefined)).resolves.toBeNull();
  });

  it('returns projected objects with merged weight', async () => {
    const accounts = {
      findByName: jest.fn().mockResolvedValue({ name: 'alice' }),
    } as unknown as AccountsCurrentRepository;

    const objectFollows = {
      countByAccount: jest.fn().mockResolvedValue(1),
      findObjectsByAccount: jest.fn().mockResolvedValue([{ object_id: 'o1', weight: 99 }]),
    } as unknown as UserObjectFollowsRepository;

    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'restaurant',
      creator: 'c',
      weight: 5,
      meta_group_id: null,
      canonical: null,
      fields: {},
    };

    const core: ObjectsCore = {
      object_id: 'o1',
      object_type: 'restaurant',
      creator: 'c',
      weight: 5,
      meta_group_id: null,
      canonical: null,
      canonical_creator: null,
      transaction_id: 'tx',
      status: 'active',
      seq: 0,
    };

    const aggregatedObjectRepo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [{ core, updates: [], validity_votes: [], authorities: [] }],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;

    const objectViewService = {
      resolve: jest.fn().mockReturnValue([mockView]),
    } as unknown as ObjectViewService;

    const projected: ProjectedObject = {
      object_id: 'o1',
      object_type: 'restaurant',
      semantic_type: null,
      weight: 5,
      fields: {},
      hasAdministrativeAuthority: false,
      hasOwnershipAuthority: false,
    };

    const objectProjection = {
      batchProject: jest.fn().mockResolvedValue([projected]),
    } as unknown as ObjectProjectionService;

    const endpoint = new GetUserFollowingObjectsEndpoint(
      accounts,
      objectFollows,
      aggregatedObjectRepo,
      objectViewService,
      objectProjection,
    );

    const result = await endpoint.execute('alice', query, 'en-US', undefined, undefined);

    expect(result?.total).toBe(1);
    expect(result?.items[0]?.weight).toBe(99);
    expect(objectProjection.batchProject).toHaveBeenCalled();
  });
});

function stubDeps(): {
  objectFollows: UserObjectFollowsRepository;
  aggregatedObjectRepo: AggregatedObjectRepository;
  objectViewService: ObjectViewService;
  objectProjection: ObjectProjectionService;
} {
  return {
    objectFollows: {} as UserObjectFollowsRepository,
    aggregatedObjectRepo: {} as AggregatedObjectRepository,
    objectViewService: {} as ObjectViewService,
    objectProjection: {} as ObjectProjectionService,
  };
}
