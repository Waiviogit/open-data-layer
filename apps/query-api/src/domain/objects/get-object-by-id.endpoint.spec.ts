import type { GovernanceSnapshot, ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { DEFAULT_GOVERNANCE_SNAPSHOT, ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories';
import type { ObjectUpdatesRepository } from '../../repositories/object-updates.repository';
import type { ObjectAuthorityRepository } from '../../repositories/object-authority.repository';
import type { UserObjectFollowsRepository } from '../../repositories/user-object-follows.repository';
import { GovernanceResolverService } from '../governance';
import { ObjectProjectionService } from '../object-projection/object-projection.service';
import { emptyRankVoteProjection, type ProjectedObject } from '../object-projection/projected-object.types';
import { GetObjectByIdEndpoint } from './get-object-by-id.endpoint';

function createEndpointDeps(overrides?: {
  resolveMerged?: GovernanceSnapshot;
}) {
  const governanceResolver = {
    resolveMergedForObjectView: jest.fn().mockImplementation(() =>
      Promise.resolve(overrides?.resolveMerged ?? DEFAULT_GOVERNANCE_SNAPSHOT),
    ),
  } as unknown as GovernanceResolverService;
  return { governanceResolver };
}

function projectedFixture(objectId: string): ProjectedObject {
  return {
    object_id: objectId,
    object_type: 'x',
    semantic_type: null,
    weight: null,
    fields: {},
    hasAdministrativeAuthority: false,
    hasOwnershipAuthority: false,
  };
}

describe('GetObjectByIdEndpoint', () => {
  it('returns null when repository returns no object', async () => {
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = {
      resolve: jest.fn(),
    } as unknown as ObjectViewService;
    const projectionService = {
      project: jest.fn(),
    } as unknown as ObjectProjectionService;
    const followsRepo = {
      countByObjectId: jest.fn(),
    } as unknown as UserObjectFollowsRepository;
    const updatesRepo = {
      countByObjectId: jest.fn(),
    } as unknown as ObjectUpdatesRepository;
    const authorityRepo = {
      countByObjectIdAndType: jest.fn(),
    } as unknown as ObjectAuthorityRepository;
    const { governanceResolver } = createEndpointDeps();

    const endpoint = new GetObjectByIdEndpoint(
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      authorityRepo,
    );
    const result = await endpoint.execute({
      objectId: 'missing',
      updateTypes: ['name'],
      locale: 'en-US',
    });

    expect(result).toBeNull();
    expect(viewService.resolve).not.toHaveBeenCalled();
    expect(governanceResolver.resolveMergedForObjectView).not.toHaveBeenCalled();
    expect(projectionService.project).not.toHaveBeenCalled();
  });

  it('returns projected object with counts when object exists', async () => {
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      canonical: null,
      fields: {},
    };
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [
          {
            core: { object_id: 'o1', object_type: 'x', creator: 'c' },
            updates: [],
            validity_votes: [],
            authorities: [],
          },
        ],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = {
      resolve: jest.fn().mockReturnValue([mockView]),
    } as unknown as ObjectViewService;
    const projected = projectedFixture('o1');
    const projectionService = {
      project: jest.fn().mockResolvedValue(projected),
    } as unknown as ObjectProjectionService;
    const followsRepo = {
      countByObjectId: jest.fn().mockResolvedValue(7),
      findByAccountAndObject: jest.fn().mockResolvedValue({
        account: 'alice',
        object_id: 'o1',
        bell: true,
        created_at: new Date(),
      }),
    } as unknown as UserObjectFollowsRepository;
    const updateTypeCounts = { name: 10, menuItem: 15 };
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn().mockResolvedValue(updateTypeCounts),
    } as unknown as ObjectUpdatesRepository;
    const authorityRepo = {
      countByObjectIdAndType: jest
        .fn()
        .mockImplementation(
          (_id: string, authorityType: 'administrative' | 'ownership') =>
            Promise.resolve(authorityType === 'administrative' ? 2 : 3),
        ),
    } as unknown as ObjectAuthorityRepository;
    const { governanceResolver } = createEndpointDeps();

    const endpoint = new GetObjectByIdEndpoint(
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      authorityRepo,
    );
    const result = await endpoint.execute({
      objectId: 'o1',
      updateTypes: ['name'],
      locale: 'en-US',
      includeRejected: true,
      viewerAccount: 'alice',
    });

    expect(result).toEqual({
      ...projected,
      followers_count: 7,
      updates_count: 25,
      administrative_count: 2,
      ownership_count: 3,
      is_following: true,
      viewer_bell: true,
      update_type_counts: updateTypeCounts,
    });
    expect(followsRepo.findByAccountAndObject).toHaveBeenCalledWith('alice', 'o1');
    expect(governanceResolver.resolveMergedForObjectView).toHaveBeenCalledWith(undefined);
    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      expect.objectContaining({
        update_types: ['name'],
        locale: 'en-US',
        include_rejected: true,
        governance: DEFAULT_GOVERNANCE_SNAPSHOT,
      }),
    );
    expect(projectionService.project).toHaveBeenCalledWith(
      mockView,
      expect.objectContaining({
        locale: 'en-US',
        governanceObjectIdFromHeader: undefined,
        viewerAccount: 'alice',
        rankVoteProjection: expect.any(Object),
      }),
    );
    expect(followsRepo.countByObjectId).toHaveBeenCalledWith('o1');
    expect(updatesRepo.countByObjectIdGroupByUpdateType).toHaveBeenCalledWith('o1');
    expect(authorityRepo.countByObjectIdAndType).toHaveBeenCalledWith('o1', 'administrative');
    expect(authorityRepo.countByObjectIdAndType).toHaveBeenCalledWith('o1', 'ownership');
  });

  it('when updateTypes is empty, resolves all distinct update types from aggregated updates', async () => {
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      canonical: null,
      fields: {},
    };
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [
          {
            core: { object_id: 'o1', object_type: 'x', creator: 'c' },
            updates: [
              {
                update_id: 'u1',
                object_id: 'o1',
                update_type: 'title',
                creator: 'c',
                event_seq: BigInt(1),
                locale: null,
                created_at_unix: 0,
                value_text: null,
                value_json: null,
              },
              {
                update_id: 'u2',
                object_id: 'o1',
                update_type: 'description',
                creator: 'c',
                event_seq: BigInt(2),
                locale: null,
                created_at_unix: 0,
                value_text: null,
                value_json: null,
              },
            ],
            validity_votes: [],
            authorities: [],
          },
        ],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = {
      resolve: jest.fn().mockReturnValue([mockView]),
    } as unknown as ObjectViewService;
    const projectionService = {
      project: jest.fn().mockResolvedValue(projectedFixture('o1')),
    } as unknown as ObjectProjectionService;
    const followsRepo = {
      countByObjectId: jest.fn().mockResolvedValue(0),
    } as unknown as UserObjectFollowsRepository;
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn().mockResolvedValue({}),
    } as unknown as ObjectUpdatesRepository;
    const authorityRepo = {
      countByObjectIdAndType: jest.fn().mockResolvedValue(0),
    } as unknown as ObjectAuthorityRepository;
    const { governanceResolver } = createEndpointDeps();

    const endpoint = new GetObjectByIdEndpoint(
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      authorityRepo,
    );
    await endpoint.execute({
      objectId: 'o1',
      updateTypes: [],
      locale: 'en-US',
    });

    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      expect.objectContaining({
        update_types: expect.arrayContaining(['title', 'description']),
        governance: DEFAULT_GOVERNANCE_SNAPSHOT,
      }),
    );
    const call = (viewService.resolve as jest.Mock).mock.calls[0];
    expect(call[2].update_types).toHaveLength(2);
  });

  it('uses governance from resolveMergedForObjectView when platform governance is configured', async () => {
    const customGovernance = {
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      admins: ['admin-from-gov'],
    };
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      canonical: null,
      fields: {},
    };
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [
          {
            core: { object_id: 'o1', object_type: 'x', creator: 'c' },
            updates: [],
            validity_votes: [],
            authorities: [],
          },
        ],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = {
      resolve: jest.fn().mockReturnValue([mockView]),
    } as unknown as ObjectViewService;
    const projectionService = {
      project: jest.fn().mockResolvedValue(projectedFixture('o1')),
    } as unknown as ObjectProjectionService;
    const followsRepo = {
      countByObjectId: jest.fn().mockResolvedValue(0),
    } as unknown as UserObjectFollowsRepository;
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn().mockResolvedValue({}),
    } as unknown as ObjectUpdatesRepository;
    const authorityRepo = {
      countByObjectIdAndType: jest.fn().mockResolvedValue(0),
    } as unknown as ObjectAuthorityRepository;
    const { governanceResolver } = createEndpointDeps({
      resolveMerged: customGovernance,
    });

    const endpoint = new GetObjectByIdEndpoint(
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      authorityRepo,
    );
    await endpoint.execute({
      objectId: 'o1',
      updateTypes: ['name'],
      locale: 'en-US',
    });

    expect(governanceResolver.resolveMergedForObjectView).toHaveBeenCalledWith(undefined);
    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      expect.objectContaining({
        governance: customGovernance,
      }),
    );
  });

  it('passes header governance id to resolveMergedForObjectView', async () => {
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      canonical: null,
      fields: {},
    };
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [
          {
            core: { object_id: 'o1', object_type: 'x', creator: 'c' },
            updates: [],
            validity_votes: [],
            authorities: [],
          },
        ],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = {
      resolve: jest.fn().mockReturnValue([mockView]),
    } as unknown as ObjectViewService;
    const projectionService = {
      project: jest.fn().mockResolvedValue(projectedFixture('o1')),
    } as unknown as ObjectProjectionService;
    const followsRepo = {
      countByObjectId: jest.fn().mockResolvedValue(0),
    } as unknown as UserObjectFollowsRepository;
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn().mockResolvedValue({}),
    } as unknown as ObjectUpdatesRepository;
    const authorityRepo = {
      countByObjectIdAndType: jest.fn().mockResolvedValue(0),
    } as unknown as ObjectAuthorityRepository;
    const { governanceResolver } = createEndpointDeps();

    const endpoint = new GetObjectByIdEndpoint(
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      authorityRepo,
    );
    await endpoint.execute({
      objectId: 'o1',
      updateTypes: ['name'],
      locale: 'en-US',
      governanceObjectIdFromHeader: 'hdr-gov',
    });

    expect(governanceResolver.resolveMergedForObjectView).toHaveBeenCalledWith('hdr-gov');
    expect(projectionService.project).toHaveBeenCalledWith(
      mockView,
      expect.objectContaining({
        governanceObjectIdFromHeader: 'hdr-gov',
        rankVoteProjection: expect.any(Object),
      }),
    );
  });

  it('returns null when resolve yields no view', async () => {
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [
          {
            core: { object_id: 'o1', object_type: 'x', creator: 'c' },
            updates: [],
            validity_votes: [],
            authorities: [],
          },
        ],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = {
      resolve: jest.fn().mockReturnValue([]),
    } as unknown as ObjectViewService;
    const projectionService = {
      project: jest.fn(),
    } as unknown as ObjectProjectionService;
    const followsRepo = {
      countByObjectId: jest.fn(),
    } as unknown as UserObjectFollowsRepository;
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn(),
    } as unknown as ObjectUpdatesRepository;
    const authorityRepo = {
      countByObjectIdAndType: jest.fn(),
    } as unknown as ObjectAuthorityRepository;
    const { governanceResolver } = createEndpointDeps();

    const endpoint = new GetObjectByIdEndpoint(
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      authorityRepo,
    );
    const result = await endpoint.execute({
      objectId: 'o1',
      updateTypes: ['name'],
      locale: 'en-US',
    });

    expect(result).toBeNull();
    expect(projectionService.project).not.toHaveBeenCalled();
    expect(followsRepo.countByObjectId).not.toHaveBeenCalled();
    expect(updatesRepo.countByObjectIdGroupByUpdateType).not.toHaveBeenCalled();
    expect(authorityRepo.countByObjectIdAndType).not.toHaveBeenCalled();
  });
});
