import { getUpdateTypesForBlockKind } from './block-update-type-map';

describe('BLOCK_KIND_TO_UPDATE_TYPES affiliateLinks', () => {
  it('is not editable', () => {
    expect(getUpdateTypesForBlockKind('affiliateLinks', ['price', 'name'])).toEqual([]);
  });
});
