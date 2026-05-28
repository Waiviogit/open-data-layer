import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { extractSeoKeywords } from './extract-seo-keywords';
import type { FieldEntry } from './object-create.types';

describe('extractSeoKeywords', () => {
  it('returns unique non-empty tag values', () => {
    const fields: FieldEntry[] = [
      {
        entryKey: 'a',
        updateType: UPDATE_TYPES.TAG_CATEGORY_ITEM,
        value: { category: 'Cuisine', value: 'Italian' },
      },
      {
        entryKey: 'b',
        updateType: UPDATE_TYPES.TAG_CATEGORY_ITEM,
        value: { category: 'Meal Type', value: 'pizza' },
      },
      {
        entryKey: 'c',
        updateType: UPDATE_TYPES.TAG_CATEGORY_ITEM,
        value: { category: 'Cuisine', value: 'Italian' },
      },
      {
        entryKey: 'd',
        updateType: UPDATE_TYPES.TAG_CATEGORY_ITEM,
        value: { category: 'Diet', value: '' },
      },
    ];
    expect(extractSeoKeywords(fields)).toEqual(['Italian', 'pizza']);
  });

  it('returns empty array when no tags', () => {
    expect(extractSeoKeywords([])).toEqual([]);
  });
});
