import { ConfigService } from '@nestjs/config';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  ObjectFavoriteRepository,
  ObjectCategoriesRepository,
} from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { ListItemsRecursiveCountService } from '../object-projection/list-items-recursive-count.service';
import { GetCategoryObjectsEndpoint } from './get-category-objects.endpoint';
import { encodeCategoryObjectsCursor } from './category-objects-cursor';

jest.mock('../object-projection/object-ref-expansion', () => ({
  expandObjectRefs: jest.fn(),
}));

import { expandObjectRefs } from '../object-projection/object-ref-expansion';

const expandObjectRefsMock = expandObjectRefs as jest.MockedFunction<typeof expandObjectRefs>;

function makeEndpoint(deps: {
  objectCategoriesRepo: { findObjectIdsByCategoryName: jest.Mock };
  objectFavoriteRepo?: { findFavoriteObjectIdsForAccount: jest.Mock };
}) {
  const governanceResolver = {
    resolveMergedForObjectView: jest.fn().mockResolvedValue({ platform: {}, merged: {} }),
  } as unknown as GovernanceResolverService;

  const listItemsRecursiveCountService = {
    countForListRefIds: jest.fn().mockResolvedValue(new Map()),
  } as unknown as ListItemsRecursiveCountService;

  const config = { get: jest.fn().mockReturnValue('https://ipfs.io') } as unknown as ConfigService;

  return new GetCategoryObjectsEndpoint(
    deps.objectCategoriesRepo as unknown as ObjectCategoriesRepository,
    {} as unknown as AggregatedObjectRepository,
    {} as unknown as ObjectViewService,
    governanceResolver,
    (deps.objectFavoriteRepo ?? {
      findFavoriteObjectIdsForAccount: jest.fn(),
    }) as unknown as ObjectFavoriteRepository,
    listItemsRecursiveCountService,
    config,
    { enrich: jest.fn() } as never,
  );
}

describe('GetCategoryObjectsEndpoint', () => {
  beforeEach(() => {
    expandObjectRefsMock.mockReset();
  });

  it('returns empty page for blank name', async () => {
    const endpoint = makeEndpoint({
      objectCategoriesRepo: { findObjectIdsByCategoryName: jest.fn() },
    });

    const result = await endpoint.execute({
      query: { name: '  ', limit: 20 },
      locale: 'en-US',
    });

    expect(result).toEqual({ items: [], hasMore: false, cursor: null });
  });

  it('preserves repo row order and encodes cursor', async () => {
    const findObjectIdsByCategoryName = jest.fn().mockResolvedValue({
      rows: [
        { object_id: 'b', weight: 5 },
        { object_id: 'a', weight: 10 },
      ],
      hasMore: true,
    });
    expandObjectRefsMock.mockResolvedValue(
      new Map([
        ['a', { object_id: 'a', object_type: 'product', fields: {}, weight: null }],
        ['b', { object_id: 'b', object_type: 'product', fields: {}, weight: null }],
      ]),
    );

    const endpoint = makeEndpoint({ objectCategoriesRepo: { findObjectIdsByCategoryName } });

    const result = await endpoint.execute({
      query: { name: 'Active Skirts', limit: 2, exclude_object_id: 'host' },
      locale: 'en-US',
      viewerAccount: 'alice',
    });

    expect(result.items.map((i) => i.object_id)).toEqual(['b', 'a']);
    expect(result.hasMore).toBe(true);
    expect(result.cursor).toBe(
      encodeCategoryObjectsCursor({ weight: 10, object_id: 'a' }),
    );
    expect(findObjectIdsByCategoryName).toHaveBeenCalledWith({
      categoryName: 'Active Skirts',
      limit: 2,
      cursor: null,
      excludeObjectId: 'host',
    });
  });

  it('returns empty page when repo finds no rows', async () => {
    const endpoint = makeEndpoint({
      objectCategoriesRepo: {
        findObjectIdsByCategoryName: jest.fn().mockResolvedValue({ rows: [], hasMore: false }),
      },
    });

    const result = await endpoint.execute({
      query: { name: 'Missing', limit: 20 },
      locale: 'en-US',
    });

    expect(result).toEqual({ items: [], hasMore: false, cursor: null });
    expect(expandObjectRefsMock).not.toHaveBeenCalled();
  });
});
