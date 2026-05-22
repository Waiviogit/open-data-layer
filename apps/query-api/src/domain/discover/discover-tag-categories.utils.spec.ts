import { groupDiscoverTagCategories } from './discover-tag-categories.utils';

describe('groupDiscoverTagCategories', () => {
  it('groups rows by category and preserves registry order', () => {
    const result = groupDiscoverTagCategories(
      [
        { category: 'Pros', tag_value: 'Bitter', object_count: 2 },
        { category: 'Category', tag_value: 'Backpack', object_count: 5 },
        { category: 'Cons', tag_value: 'Heavy', object_count: 1 },
      ],
      ['Category', 'Pros', 'Cons'],
    );

    expect(result.categories.map((c) => c.category)).toEqual(['Category', 'Pros', 'Cons']);
    expect(result.categories[0]?.items[0]).toEqual({ value: 'Backpack', count: 5 });
    expect(result.categories[1]?.items[0]).toEqual({ value: 'Bitter', count: 2 });
  });

  it('appends unknown categories alphabetically after ordered ones', () => {
    const result = groupDiscoverTagCategories(
      [{ category: 'Zebra', tag_value: 'A', object_count: 1 }],
      ['Category'],
    );
    expect(result.categories.map((c) => c.category)).toEqual(['Zebra']);
  });
});
