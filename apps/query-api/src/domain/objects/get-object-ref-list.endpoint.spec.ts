import { UPDATE_TYPES } from '@opden-data-layer/core';
import { GetObjectRefListEndpoint } from './get-object-ref-list.endpoint';

describe('GetObjectRefListEndpoint', () => {
  const governance = { platform: {}, merged: {} } as never;

  function makeEndpoint(deps: {
    core: { findByObjectIdForPage: jest.Mock };
    aggregated: { loadByObjectIds: jest.Mock };
    viewService: { resolve: jest.Mock };
    governanceResolver: { resolveMergedForObjectView: jest.Mock };
    authorityRepo: { findFavoriteObjectIdsForAccount: jest.Mock };
    objectRefListRepo: {
      findMetaGroupIdsByObjectIds: jest.Mock;
      findCategoryNamesByObjectId: jest.Mock;
      findRelatedBackfillObjectIds: jest.Mock;
      findSimilarBackfillObjectIds: jest.Mock;
      findReverseAddOnObjectIds: jest.Mock;
    };
  }) {
    const listItemsRecursiveCountService = {
      countForListRefIds: jest.fn().mockResolvedValue(new Map()),
    };
    const config = { get: jest.fn().mockReturnValue('https://ipfs.io') };

    return new GetObjectRefListEndpoint(
      { findByObjectIdForPage: deps.core.findByObjectIdForPage } as never,
      { loadByObjectIds: deps.aggregated.loadByObjectIds } as never,
      deps.viewService as never,
      deps.governanceResolver as never,
      deps.authorityRepo as never,
      listItemsRecursiveCountService as never,
      deps.objectRefListRepo as never,
      config as never,
      { enrich: jest.fn() } as never,
    );
  }

  const defaultRefRepo = {
    findMetaGroupIdsByObjectIds: jest.fn().mockResolvedValue([]),
    findCategoryNamesByObjectId: jest.fn().mockResolvedValue([]),
    findRelatedBackfillObjectIds: jest.fn().mockResolvedValue([]),
    findSimilarBackfillObjectIds: jest.fn().mockResolvedValue([]),
    findReverseAddOnObjectIds: jest.fn().mockResolvedValue([]),
  };

  it('returns null when object is missing', async () => {
    const endpoint = makeEndpoint({
      core: { findByObjectIdForPage: jest.fn().mockResolvedValue(null) },
      aggregated: { loadByObjectIds: jest.fn() },
      viewService: { resolve: jest.fn() },
      governanceResolver: { resolveMergedForObjectView: jest.fn().mockResolvedValue(governance) },
      authorityRepo: { findFavoriteObjectIdsForAccount: jest.fn() },
      objectRefListRepo: defaultRefRepo,
    });

    const result = await endpoint.execute(
      'missing',
      UPDATE_TYPES.IS_RELATED_TO,
      { limit: 20 },
      'en-US',
    );

    expect(result).toBeNull();
  });

  it('returns empty page when update type has no refs and no backfill', async () => {
    const view = {
      object_id: 'host',
      fields: {},
    };

    const endpoint = makeEndpoint({
      core: { findByObjectIdForPage: jest.fn().mockResolvedValue({ object_id: 'host' }) },
      aggregated: {
        loadByObjectIds: jest.fn().mockResolvedValue({
          objects: [{ core: { object_id: 'host' }, updates: [] }],
          voterWaivPowers: new Map(),
        }),
      },
      viewService: { resolve: jest.fn().mockReturnValue([view]) },
      governanceResolver: { resolveMergedForObjectView: jest.fn().mockResolvedValue(governance) },
      authorityRepo: { findFavoriteObjectIdsForAccount: jest.fn() },
      objectRefListRepo: defaultRefRepo,
    });

    const result = await endpoint.execute(
      'host',
      UPDATE_TYPES.IS_RELATED_TO,
      { limit: 20 },
      'en-US',
    );

    expect(result).toEqual({ items: [], hasMore: false, cursor: null });
  });
});
