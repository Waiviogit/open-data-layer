import { hasInstacartIdentifier } from './has-instacart-identifier';

describe('hasInstacartIdentifier', () => {
  it('matches identifier type instacart case-insensitively', () => {
    expect(hasInstacartIdentifier({ identifier: [{ type: 'Instacart' }] })).toBe(true);
    expect(hasInstacartIdentifier({ identifier: [{ type: 'instacart' }] })).toBe(true);
  });

  it('does not require a value', () => {
    expect(hasInstacartIdentifier({ identifier: [{ type: 'instacart' }] })).toBe(true);
  });

  it('returns false for other identifier types', () => {
    expect(hasInstacartIdentifier({ identifier: [{ type: 'asin', value: 'B001' }] })).toBe(
      false,
    );
  });
});
