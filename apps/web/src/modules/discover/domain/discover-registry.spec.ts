import {
  getTagCategoryNamesForObjectType,
  listDiscoverObjectTypes,
  objectTypeHasTagCategoryFilters,
} from './discover-registry';

describe('discover-registry', () => {
  it('lists object types from registry', () => {
    const types = listDiscoverObjectTypes();
    expect(types).toContain('product');
    expect(types.length).toBeGreaterThan(10);
  });

  it('product has tag category filters', () => {
    expect(objectTypeHasTagCategoryFilters('product')).toBe(true);
    expect(getTagCategoryNamesForObjectType('product')).toEqual([
      'Category',
      'Pros',
      'Cons',
    ]);
  });

  it('hashtag has no tag category filters', () => {
    expect(objectTypeHasTagCategoryFilters('hashtag')).toBe(false);
  });
});
