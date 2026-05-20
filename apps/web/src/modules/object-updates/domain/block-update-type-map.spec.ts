import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { getUpdateTypesForBlockKind } from './block-update-type-map';

describe('getUpdateTypesForBlockKind', () => {
  const supported = [
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.TELEPHONE,
    UPDATE_TYPES.TAG_CATEGORY,
    UPDATE_TYPES.TAG_CATEGORY_ITEM,
  ];

  it('returns camelCase update types filtered by supported list', () => {
    expect(getUpdateTypesForBlockKind('phones', supported)).toEqual([
      UPDATE_TYPES.TELEPHONE,
    ]);
    expect(getUpdateTypesForBlockKind('tags', supported)).toEqual([
      UPDATE_TYPES.TAG_CATEGORY_ITEM,
      UPDATE_TYPES.TAG_CATEGORY,
    ]);
  });

  it('returns empty for rating block', () => {
    expect(getUpdateTypesForBlockKind('rating', supported)).toEqual([]);
  });

  it('returns empty when type not supported for object', () => {
    expect(getUpdateTypesForBlockKind('geo', supported)).toEqual([]);
  });
});
