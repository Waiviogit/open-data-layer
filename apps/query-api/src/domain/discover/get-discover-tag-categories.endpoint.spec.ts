import { GetDiscoverTagCategoriesEndpoint } from './get-discover-tag-categories.endpoint';
import type { DiscoverRepository } from '../../repositories/discover.repository';

describe('GetDiscoverTagCategoriesEndpoint', () => {
  it('maps flat rows into grouped sections', async () => {
    const discoverRepo = {
      getTagCategories: jest.fn().mockResolvedValue([
        { category: 'Pros', tag_value: 'Bitter', object_count: 3 },
        { category: 'Category', tag_value: 'Backpack', object_count: 10 },
      ]),
    } as unknown as DiscoverRepository;

    const endpoint = new GetDiscoverTagCategoriesEndpoint(discoverRepo);
    const result = await endpoint.execute({ query: { object_type: 'product' } });

    expect(result.categories[0]?.category).toBe('Category');
    expect(result.categories[0]?.items[0]).toEqual({ value: 'Backpack', count: 10 });
    expect(result.categories[1]?.category).toBe('Pros');
  });
});
