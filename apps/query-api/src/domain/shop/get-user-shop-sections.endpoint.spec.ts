jest.mock('../categories/build-user-categories-response', () => ({
  buildUserCategoriesResponse: jest.fn(),
}));

import { buildUserCategoriesResponse } from '../categories/build-user-categories-response';
import { GetUserShopSectionsEndpoint } from './get-user-shop-sections.endpoint';

const mockedBuildNav = buildUserCategoriesResponse as jest.MockedFunction<
  typeof buildUserCategoriesResponse
>;

describe('GetUserShopSectionsEndpoint', () => {
  beforeEach(() => {
    mockedBuildNav.mockReturnValue({
      items: [
        { name: 'Desserts', objects_count: 3, has_children: false },
        { name: 'comfort food', objects_count: 1, has_children: false },
        { name: 'Comfort Foods', objects_count: 1, has_children: false },
      ],
      uncategorized_count: 0,
      show_other: false,
    });
  });

  it('omits categories with zero filtered matches when tags are active', async () => {
    const objectCategoriesRepo = {
      countObjectIdsByScopeForCategories: jest.fn().mockResolvedValue(
        new Map([
          ['Desserts', 0],
          ['comfort food', 1],
          ['Comfort Foods', 0],
        ]),
      ),
      findObjectIdsByScopeForCategories: jest.fn().mockResolvedValue(
        new Map([['comfort food', ['obj-1']]]),
      ),
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
    const objectCategoriesRelatedRepo = {
      findByUserScope: jest.fn().mockResolvedValue([]),
    };
    const aggregatedObjectRepo = {
      loadByObjectIds: jest.fn().mockResolvedValue({
        objects: [{ core: { object_id: 'obj-1' } }],
        voterWaivPowers: {},
        rankVoteProjection: {},
      }),
    };
    const objectViewService = {
      resolve: jest.fn().mockReturnValue([{ object_id: 'obj-1' }]),
    };
    const objectProjection = {
      batchProject: jest.fn().mockResolvedValue([{ object_id: 'obj-1' }]),
    };

    const endpoint = new GetUserShopSectionsEndpoint(
      userMetadataRepo as never,
      shopDeselectRepo as never,
      objectCategoriesRelatedRepo as never,
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
        path: [],
        tags: ['Cuisine:asian'],
        sectionLimit: 3,
      },
      'en-US',
      undefined,
      undefined,
    );

    expect(result?.sections.map((s) => s.categoryName)).toEqual(['comfort food']);
    expect(result?.sections[0]?.totalObjects).toBe(1);
    expect(objectCategoriesRepo.countObjectIdsByScopeForCategories).toHaveBeenCalled();
  });

  it('returns empty response when section cursor is unknown', async () => {
    const endpoint = new GetUserShopSectionsEndpoint(
      {
        findShopVisibilityFlags: jest.fn().mockResolvedValue({
          hide_linked_objects: false,
          hide_recipe_objects: false,
        }),
      } as never,
      { findObjectIdsByAccount: jest.fn().mockResolvedValue([]) } as never,
      { findByUserScope: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { enrich: jest.fn() } as never,
    );

    const result = await endpoint.execute(
      'alice',
      {
        types: ['recipe'],
        path: [],
        tags: [],
        cursor: 'missing-category',
        sectionLimit: 3,
      },
      'en-US',
      undefined,
      undefined,
    );

    expect(result).toEqual({ sections: [], cursor: null, hasMore: false });
  });
});
