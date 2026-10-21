import type { GovernanceSnapshot, ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { DEFAULT_GOVERNANCE_SNAPSHOT, ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories';
import type { ObjectUpdatesRepository } from '../../repositories/object-updates.repository';
import type { ObjectFavoriteRepository } from '../../repositories/object-favorite.repository';
import type { ObjectOwnershipRepository } from '../../repositories/object-ownership.repository';
import type { UserObjectFollowsRepository } from '../../repositories/user-object-follows.repository';
import type { UserObjectExpertiseRepository } from '../../repositories/user-object-expertise.repository';
import type { PostsRepository } from '../../repositories/posts.repository';
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
    status: 'active',
    weight: null,
    fields: {},
    isFavorited: false,
      hasSupervisedOwnership: false,
      hasExclusiveOwnership: false,
      hasOwnershipAuthority: false,
  };
}

function createPostsRepo(postsCount = 0): PostsRepository {
  return {
    countPostObjectsByObjectId: jest.fn().mockResolvedValue(postsCount),
  } as unknown as PostsRepository;
}

function createExpertiseRepo(expertsCount = 0): UserObjectExpertiseRepository {
  return {
    countByObjectId: jest.fn().mockResolvedValue(expertsCount),
  } as unknown as UserObjectExpertiseRepository;
}

function createFavoriteRepo(favoritedByCount = 0): ObjectFavoriteRepository {
  return {
    countByObjectId: jest.fn().mockResolvedValue(favoritedByCount),
  } as unknown as ObjectFavoriteRepository;
}

function createOwnershipRepo(supervised = 0, exclusive = 0): ObjectOwnershipRepository {
  return {
    countByObjectIdAndType: jest
      .fn()
      .mockImplementation((_id: string, ownershipType: 'supervised' | 'exclusive') =>
        Promise.resolve(ownershipType === 'supervised' ? supervised : exclusive),
      ),
  } as unknown as ObjectOwnershipRepository;
}

function makeEndpoint(
  deps: {
    repo: AggregatedObjectRepository;
    viewService: ObjectViewService;
    governanceResolver: GovernanceResolverService;
    projectionService: ObjectProjectionService;
    followsRepo: UserObjectFollowsRepository;
    expertiseRepo?: UserObjectExpertiseRepository;
    updatesRepo: ObjectUpdatesRepository;
    favoriteRepo: ObjectFavoriteRepository;
    ownershipRepo: ObjectOwnershipRepository;
    postsRepo?: PostsRepository;
  },
) {
  return new GetObjectByIdEndpoint(
    deps.repo,
    deps.viewService,
    deps.governanceResolver,
    deps.projectionService,
    deps.followsRepo,
    deps.expertiseRepo ?? createExpertiseRepo(),
    deps.updatesRepo,
    deps.favoriteRepo,
    deps.ownershipRepo,
    deps.postsRepo ?? createPostsRepo(),
    { enrich: jest.fn() } as never,
  );
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
    const viewService = { resolve: jest.fn() } as unknown as ObjectViewService;
    const projectionService = { project: jest.fn() } as unknown as ObjectProjectionService;
    const followsRepo = { countByObjectId: jest.fn() } as unknown as UserObjectFollowsRepository;
    const updatesRepo = { countByObjectId: jest.fn() } as unknown as ObjectUpdatesRepository;
    const { governanceResolver } = createEndpointDeps();

    const endpoint = makeEndpoint({
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      favoriteRepo: createFavoriteRepo(),
      ownershipRepo: createOwnershipRepo(),
    });

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
      status: 'active',
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
            favorites: [],
            ownerships: [],
          },
        ],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = { resolve: jest.fn().mockReturnValue([mockView]) } as unknown as ObjectViewService;
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
    const updateLocales = ['en-US', 'ko-KR'];
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn().mockResolvedValue(updateTypeCounts),
      findDistinctLocalesByObjectId: jest.fn().mockResolvedValue(updateLocales),
    } as unknown as ObjectUpdatesRepository;
    const favoriteRepo = createFavoriteRepo(2);
    const ownershipRepo = createOwnershipRepo(2, 1);
    const postsRepo = createPostsRepo(4);
    const expertiseRepo = createExpertiseRepo(5);
    const { governanceResolver } = createEndpointDeps();

    const endpoint = makeEndpoint({
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      expertiseRepo,
      updatesRepo,
      favoriteRepo,
      ownershipRepo,
      postsRepo,
    });

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
      experts_count: 5,
      posts_count: 4,
      updates_count: 25,
      favorited_by_count: 2,
      supervised_count: 2,
      exclusive_count: 1,
      is_following: true,
      viewer_bell: true,
      update_type_counts: updateTypeCounts,
      update_locales: updateLocales,
    });
    expect(followsRepo.findByAccountAndObject).toHaveBeenCalledWith('alice', 'o1');
    expect(favoriteRepo.countByObjectId).toHaveBeenCalledWith('o1');
    expect(ownershipRepo.countByObjectIdAndType).toHaveBeenCalledWith('o1', 'supervised');
    expect(ownershipRepo.countByObjectIdAndType).toHaveBeenCalledWith('o1', 'exclusive');
    expect(postsRepo.countPostObjectsByObjectId).toHaveBeenCalledWith('o1');
  });

  it('when updateTypes is empty, resolves all distinct update types from aggregated updates', async () => {
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      status: 'active',
      canonical: null,
      fields: {},
    };
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [
          {
            core: { object_id: 'o1', object_type: 'x', creator: 'c' },
            updates: [
              { update_id: 'u1', object_id: 'o1', update_type: 'title', creator: 'c' },
              { update_id: 'u2', object_id: 'o1', update_type: 'description', creator: 'c' },
            ],
            validity_votes: [],
            favorites: [],
            ownerships: [],
          },
        ],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = { resolve: jest.fn().mockReturnValue([mockView]) } as unknown as ObjectViewService;
    const projectionService = {
      project: jest.fn().mockResolvedValue(projectedFixture('o1')),
    } as unknown as ObjectProjectionService;
    const followsRepo = { countByObjectId: jest.fn().mockResolvedValue(0) } as unknown as UserObjectFollowsRepository;
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn().mockResolvedValue({}),
      findDistinctLocalesByObjectId: jest.fn().mockResolvedValue([]),
    } as unknown as ObjectUpdatesRepository;
    const { governanceResolver } = createEndpointDeps();

    const endpoint = makeEndpoint({
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      favoriteRepo: createFavoriteRepo(),
      ownershipRepo: createOwnershipRepo(),
    });

    await endpoint.execute({ objectId: 'o1', updateTypes: [], locale: 'en-US' });

    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      expect.objectContaining({
        update_types: expect.arrayContaining(['title', 'description', 'identifier']),
        governance: DEFAULT_GOVERNANCE_SNAPSHOT,
      }),
    );
  });

  it('adds identifier when the client passed an explicit update type list', async () => {
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      status: 'active',
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
            favorites: [],
            ownerships: [],
          },
        ],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = { resolve: jest.fn().mockReturnValue([mockView]) } as unknown as ObjectViewService;
    const projectionService = {
      project: jest.fn().mockResolvedValue(projectedFixture('o1')),
    } as unknown as ObjectProjectionService;
    const followsRepo = { countByObjectId: jest.fn().mockResolvedValue(0) } as unknown as UserObjectFollowsRepository;
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn().mockResolvedValue({}),
      findDistinctLocalesByObjectId: jest.fn().mockResolvedValue([]),
    } as unknown as ObjectUpdatesRepository;
    const { governanceResolver } = createEndpointDeps();

    const endpoint = makeEndpoint({
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      favoriteRepo: createFavoriteRepo(),
      ownershipRepo: createOwnershipRepo(),
    });

    await endpoint.execute({ objectId: 'o1', updateTypes: ['name'], locale: 'en-US' });

    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      expect.objectContaining({
        update_types: ['name', 'identifier'],
      }),
    );
  });

  it('uses governance from resolveMergedForObjectView when platform governance is configured', async () => {
    const customGovernance = { ...DEFAULT_GOVERNANCE_SNAPSHOT, admins: ['admin-from-gov'] };
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      status: 'active',
      canonical: null,
      fields: {},
    };
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [{ core: { object_id: 'o1' }, updates: [], validity_votes: [], favorites: [], ownerships: [] }],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = { resolve: jest.fn().mockReturnValue([mockView]) } as unknown as ObjectViewService;
    const projectionService = {
      project: jest.fn().mockResolvedValue(projectedFixture('o1')),
    } as unknown as ObjectProjectionService;
    const followsRepo = { countByObjectId: jest.fn().mockResolvedValue(0) } as unknown as UserObjectFollowsRepository;
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn().mockResolvedValue({}),
      findDistinctLocalesByObjectId: jest.fn().mockResolvedValue([]),
    } as unknown as ObjectUpdatesRepository;
    const { governanceResolver } = createEndpointDeps({ resolveMerged: customGovernance });

    const endpoint = makeEndpoint({
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      favoriteRepo: createFavoriteRepo(),
      ownershipRepo: createOwnershipRepo(),
    });

    await endpoint.execute({ objectId: 'o1', updateTypes: ['name'], locale: 'en-US' });

    expect(viewService.resolve).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      expect.objectContaining({ governance: customGovernance }),
    );
  });

  it('passes header governance id to resolveMergedForObjectView', async () => {
    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'x',
      creator: 'c',
      weight: null,
      meta_group_id: null,
      status: 'active',
      canonical: null,
      fields: {},
    };
    const repo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [{ core: { object_id: 'o1' }, updates: [], validity_votes: [], favorites: [], ownerships: [] }],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = { resolve: jest.fn().mockReturnValue([mockView]) } as unknown as ObjectViewService;
    const projectionService = {
      project: jest.fn().mockResolvedValue(projectedFixture('o1')),
    } as unknown as ObjectProjectionService;
    const followsRepo = { countByObjectId: jest.fn().mockResolvedValue(0) } as unknown as UserObjectFollowsRepository;
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn().mockResolvedValue({}),
      findDistinctLocalesByObjectId: jest.fn().mockResolvedValue([]),
    } as unknown as ObjectUpdatesRepository;
    const { governanceResolver } = createEndpointDeps();

    const endpoint = makeEndpoint({
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      favoriteRepo: createFavoriteRepo(),
      ownershipRepo: createOwnershipRepo(),
    });

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
        objects: [{ core: { object_id: 'o1' }, updates: [], validity_votes: [], favorites: [], ownerships: [] }],
        voterWaivPowers: new Map(),
        rankVoteProjection: emptyRankVoteProjection(),
      }),
    } as unknown as AggregatedObjectRepository;
    const viewService = { resolve: jest.fn().mockReturnValue([]) } as unknown as ObjectViewService;
    const projectionService = { project: jest.fn() } as unknown as ObjectProjectionService;
    const followsRepo = { countByObjectId: jest.fn() } as unknown as UserObjectFollowsRepository;
    const updatesRepo = {
      countByObjectIdGroupByUpdateType: jest.fn(),
      findDistinctLocalesByObjectId: jest.fn(),
    } as unknown as ObjectUpdatesRepository;
    const favoriteRepo = createFavoriteRepo();
    const ownershipRepo = createOwnershipRepo();
    const { governanceResolver } = createEndpointDeps();

    const endpoint = makeEndpoint({
      repo,
      viewService,
      governanceResolver,
      projectionService,
      followsRepo,
      updatesRepo,
      favoriteRepo,
      ownershipRepo,
    });

    const result = await endpoint.execute({ objectId: 'o1', updateTypes: ['name'], locale: 'en-US' });

    expect(result).toBeNull();
    expect(projectionService.project).not.toHaveBeenCalled();
    expect(followsRepo.countByObjectId).not.toHaveBeenCalled();
    expect(favoriteRepo.countByObjectId).not.toHaveBeenCalled();
    expect(ownershipRepo.countByObjectIdAndType).not.toHaveBeenCalled();
  });
});
