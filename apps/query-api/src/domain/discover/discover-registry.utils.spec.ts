import { getTagCategoryOrderForObjectType } from './discover-registry.utils';

describe('getTagCategoryOrderForObjectType', () => {
  it('returns TAG_CATEGORY values for product in registry order', () => {
    expect(getTagCategoryOrderForObjectType('product')).toEqual([
      'Category',
      'Pros',
      'Cons',
    ]);
  });

  it('returns empty array for unknown type', () => {
    expect(getTagCategoryOrderForObjectType('unknown-type')).toEqual([]);
  });
});
