import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { allowsMultipleUpdateRows } from './allows-multiple-update-rows';

describe('allowsMultipleUpdateRows', () => {
  it('returns true for governance multi user_ref types without supposed_updates seeds', () => {
    expect(allowsMultipleUpdateRows(UPDATE_TYPES.ADMINS)).toBe(true);
    expect(allowsMultipleUpdateRows(UPDATE_TYPES.TRUSTED)).toBe(true);
    expect(allowsMultipleUpdateRows(UPDATE_TYPES.MODERATORS)).toBe(true);
  });

  it('returns false for single-cardinality types', () => {
    expect(allowsMultipleUpdateRows(UPDATE_TYPES.NAME)).toBe(false);
    expect(allowsMultipleUpdateRows(UPDATE_TYPES.DELEGATION)).toBe(false);
    expect(allowsMultipleUpdateRows(UPDATE_TYPES.PARENT)).toBe(false);
  });

  it('returns true for other multi types such as tagCategory', () => {
    expect(allowsMultipleUpdateRows(UPDATE_TYPES.TAG_CATEGORY)).toBe(true);
    expect(allowsMultipleUpdateRows(UPDATE_TYPES.AGGREGATE_RATING)).toBe(true);
  });
});
