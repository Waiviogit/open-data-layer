import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import {
  defaultUpdateTypeForCandidates,
  initialFormValueForUpdateTypeWithContext,
  initialTagCategoryItemFormValue,
} from './tag-category-item-form-value';

describe('tag-category-item-form-value', () => {
  it('initialTagCategoryItemFormValue picks first category', () => {
    expect(initialTagCategoryItemFormValue(['Pros', 'Cons'])).toEqual({
      category: 'Pros',
      value: '',
    });
  });

  it('defaultUpdateTypeForCandidates prefers tagCategoryItem when categories exist', () => {
    expect(
      defaultUpdateTypeForCandidates(
        [UPDATE_TYPES.TAG_CATEGORY, UPDATE_TYPES.TAG_CATEGORY_ITEM],
        ['Topics'],
      ),
    ).toBe(UPDATE_TYPES.TAG_CATEGORY_ITEM);
  });

  it('defaultUpdateTypeForCandidates falls back to first candidate without categories', () => {
    expect(
      defaultUpdateTypeForCandidates(
        [UPDATE_TYPES.TAG_CATEGORY_ITEM, UPDATE_TYPES.TAG_CATEGORY],
        [],
      ),
    ).toBe(UPDATE_TYPES.TAG_CATEGORY_ITEM);
  });

  it('initialFormValueForUpdateTypeWithContext seeds tag item category', () => {
    expect(
      initialFormValueForUpdateTypeWithContext(UPDATE_TYPES.TAG_CATEGORY_ITEM, [
        'A',
      ]),
    ).toEqual({ category: 'A', value: '' });
  });
});
