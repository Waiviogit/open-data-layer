
import { isTagCategoryItemFilled } from './tag-category-item-value';

describe('isTagCategoryItemFilled', () => {
  it('requires non-empty tag value', () => {
    expect(
      isTagCategoryItemFilled({ category: 'Cuisine', value: 'asian' }),
    ).toBe(true);
    expect(isTagCategoryItemFilled({ category: 'Cuisine', value: '' })).toBe(
      false,
    );
    expect(isTagCategoryItemFilled({ category: 'Cuisine', value: '   ' })).toBe(
      false,
    );
  });
});
