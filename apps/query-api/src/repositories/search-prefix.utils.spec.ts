import { prefixUpperBound, shouldSearchObjectIdSubstring } from './search-prefix.utils';

describe('prefixUpperBound', () => {
  it('increments last character for btree prefix upper bound', () => {
    expect(prefixUpperBound('grampo')).toBe('grampp');
  });

  it('returns empty string unchanged', () => {
    expect(prefixUpperBound('')).toBe('');
  });
});

describe('shouldSearchObjectIdSubstring', () => {
  it('returns false for short text queries without hyphen', () => {
    expect(shouldSearchObjectIdSubstring('grampo')).toBe(false);
    expect(shouldSearchObjectIdSubstring('flowmaster')).toBe(false);
  });

  it('returns true for id-shaped queries', () => {
    expect(shouldSearchObjectIdSubstring('abc-12345-uuid')).toBe(true);
  });

  it('returns false when hyphen present but too short', () => {
    expect(shouldSearchObjectIdSubstring('ab-c')).toBe(false);
  });
});
