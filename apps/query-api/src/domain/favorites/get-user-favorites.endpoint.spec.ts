import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import type { ObjectsCore } from '@opden-data-layer/odl-db-types';
import {
  AggregatedObjectRepository,
  UserFavoritesRepository,
  UserMetadataRepository,
  UserShopDeselectRepository,
} from '../../repositories';
import type { ProjectedObject } from '../object-projection';
import { ObjectProjectionService } from '../object-projection';
import { emptyRankVoteProjection } from '../object-projection/projected-object.types';
import { GetUserFavoritesEndpoint } from './get-user-favorites.endpoint';
import type { UserFavoritesQuery } from './favorites.schema';

describe('GetUserFavoritesEndpoint', () => {
  const query: UserFavoritesQuery = { skip: 0, limit: 10 };

  it('returns null for empty username', async () => {
    const endpoint = new GetUserFavoritesEndpoint(
      {} as UserMetadataRepository,
      {} as UserShopDeselectRepository,
      {} as UserFavoritesRepository,
      {} as AggregatedObjectRepository,
      {} as ObjectViewService,
      {} as ObjectProjectionService,
      { enrich: jest.fn() } as never,
    );
    await expect(endpoint.execute('  ', query, 'en-US', undefined, undefined)).resolves.toBeNull();
  });

  it('returns empty when objectType has no favorites', async () => {
    const userMetadataRepo = {
      findShopVisibilityFlags: jest.fn().mockResolvedValue({
        hide_linked_objects: false,
        hide_recipe_objects: false,
        hide_favorite_objects: false,
      }),
    } as unknown as UserMetadataRepository;
    const shopDeselectRepo = {
      findObjectIdsByAccount: jest.fn().mockResolvedValue([]),
    } as unknown as UserShopDeselectRepository;
    const favoritesRepo = {
      findTypesByScope: jest.fn(),
      countByScope: jest.fn().mockResolvedValue(0),
      findObjectIdsByScope: jest.fn().mockResolvedValue([]),
    } as unknown as UserFavoritesRepository;

    const endpoint = new GetUserFavoritesEndpoint(
      userMetadataRepo,
      shopDeselectRepo,
      favoritesRepo,
      {} as AggregatedObjectRepository,
      {} as ObjectViewService,
      {} as ObjectProjectionService,
      { enrich: jest.fn() } as never,
    );

    await expect(
      endpoint.execute('alice', { ...query, objectType: 'hotel' }, 'en-US', undefined, undefined),
    ).resolves.toEqual({ items: [], total: 0, hasMore: false });
    expect(favoritesRepo.findTypesByScope).not.toHaveBeenCalled();
    expect(favoritesRepo.countByScope).toHaveBeenCalledWith(
      expect.objectContaining({ account: 'alice' }),
      'hotel',
    );
  });

  it('returns projected favorites', async () => {
    const userMetadataRepo = {
      findShopVisibilityFlags: jest.fn().mockResolvedValue({
        hide_linked_objects: false,
        hide_recipe_objects: false,
        hide_favorite_objects: false,
      }),
    } as unknown as UserMetadataRepository;
    const shopDeselectRepo = {
      findObjectIdsByAccount: jest.fn().mockResolvedValue([]),
    } as unknown as UserShopDeselectRepository;
    const favoritesRepo = {
      findTypesByScope: jest.fn(),
      countByScope: jest.fn().mockResolvedValue(1),
      findObjectIdsByScope: jest.fn().mockResolvedValue(['o1']),
    } as unknown as UserFavoritesRepository;

    const mockView: ResolvedObjectView = {
      object_id: 'o1',
      object_type: 'restaurant',
      creator: 'c',
      weight: 5,
      meta_group_id: null,
      status: 'active',
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
      created_at: new Date('2024-01-01T00:00:00.000Z'),
    };

    const aggregatedObjectRepo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [{ core, updates: [], validity_votes: [], favorites: [], ownerships: [] }],
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
      status: 'active',
      weight: 5,
      fields: { name: 'Cafe' },
      isFavorited: true,
      hasSupervisedOwnership: false,
      hasExclusiveOwnership: false,
      hasOwnershipAuthority: false,
    };

    const objectProjection = {
      batchProject: jest.fn().mockResolvedValue([projected]),
    } as unknown as ObjectProjectionService;

    const endpoint = new GetUserFavoritesEndpoint(
      userMetadataRepo,
      shopDeselectRepo,
      favoritesRepo,
      aggregatedObjectRepo,
      objectViewService,
      objectProjection,
      { enrich: jest.fn() } as never,
    );

    await expect(
      endpoint.execute('alice', { ...query, objectType: 'restaurant' }, 'en-US', undefined, undefined),
    ).resolves.toEqual({ items: [projected], total: 1, hasMore: false });
  });
});
