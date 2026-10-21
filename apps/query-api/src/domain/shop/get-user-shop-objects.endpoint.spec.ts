jest.mock('../discover/get-discover-objects.endpoint', () => ({
  parseTagFilters: jest.fn((tags: string[]) =>
    tags.map((t) => {
      const [category, value] = t.split(':');
      return { category, value };
    }),
  ),
}));

import { GetUserShopObjectsEndpoint } from './get-user-shop-objects.endpoint';

describe('GetUserShopObjectsEndpoint', () => {
  it('returns projected items with pagination cursor', async () => {
    const objectCategoriesRepo = {
      findObjectIdsByScope: jest.fn().mockResolvedValue({
        objectIds: ['obj-1', 'obj-2'],
        nextCursor: 'obj-2',
        hasMore: true,
      }),
    };
    const userMetadataRepo = {
      findShopVisibilityFlags: jest.fn().mockResolvedValue({
        hide_linked_objects: false,
        hide_recipe_objects: false,
      }),
    };
    const shopDeselectRepo = {
      findObjectIdsByAccount: jest.fn().mockResolvedValue([]),
    };
    const aggregatedObjectRepo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [{ core: { object_id: 'obj-1' } }, { core: { object_id: 'obj-2' } }],
        voterWaivPowers: {},
        rankVoteProjection: {},
      }),
    };
    const objectViewService = {
      resolve: jest.fn().mockReturnValue([{ object_id: 'obj-1' }, { object_id: 'obj-2' }]),
    };
    const objectProjection = {
      batchProject: jest.fn().mockResolvedValue([{ object_id: 'obj-1' }, { object_id: 'obj-2' }]),
    };

    const endpoint = new GetUserShopObjectsEndpoint(
      userMetadataRepo as never,
      shopDeselectRepo as never,
      objectCategoriesRepo as never,
      aggregatedObjectRepo as never,
      objectViewService as never,
      objectProjection as never,
      { enrich: jest.fn() } as never,
    );

    const result = await endpoint.execute(
      'alice',
      {
        types: ['recipe'],
        categoryPath: [],
        uncategorizedOnly: false,
        tags: ['Cuisine:asian'],
        rating: 8,
        limit: 20,
      },
      'en-US',
      undefined,
      undefined,
    );

    expect(result).toEqual({
      items: [{ object_id: 'obj-1' }, { object_id: 'obj-2' }],
      cursor: 'obj-2',
      hasMore: true,
    });
    expect(objectCategoriesRepo.findObjectIdsByScope).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'alice',
        tags: [{ category: 'Cuisine', value: 'asian' }],
        rating: 8,
      }),
    );
  });

  it('returns empty page when no object ids match', async () => {
    const objectCategoriesRepo = {
      findObjectIdsByScope: jest.fn().mockResolvedValue({
        objectIds: [],
        nextCursor: null,
        hasMore: false,
      }),
    };
    const endpoint = new GetUserShopObjectsEndpoint(
      { findShopVisibilityFlags: jest.fn().mockResolvedValue({}) } as never,
      { findObjectIdsByAccount: jest.fn().mockResolvedValue([]) } as never,
      objectCategoriesRepo as never,
      { loadByObjectIds: jest.fn() } as never,
      { resolve: jest.fn() } as never,
      { batchProject: jest.fn() } as never,
      { enrich: jest.fn() } as never,
    );

    const result = await endpoint.execute(
      'alice',
      {
        types: ['product'],
        categoryPath: [],
        uncategorizedOnly: false,
        tags: [],
        limit: 20,
      },
      'en-US',
      undefined,
      undefined,
    );

    expect(result).toEqual({ items: [], cursor: null, hasMore: false });
  });

  it('returns null for blank username', async () => {
    const endpoint = new GetUserShopObjectsEndpoint(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { enrich: jest.fn() } as never,
    );
    expect(
      await endpoint.execute(
        '  ',
        {
          types: ['product'],
          categoryPath: [],
          uncategorizedOnly: false,
          tags: [],
          limit: 20,
        },
        'en-US',
        undefined,
        undefined,
      ),
    ).toBeNull();
  });
});
