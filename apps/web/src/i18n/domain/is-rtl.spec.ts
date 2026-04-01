import { isRTL } from './is-rtl';

describe('isRTL', () => {
  it('returns false for configured LTR locales', () => {
    expect(isRTL('en-US')).toBe(false);
    expect(isRTL('id-ID')).toBe(false);
  });

  it('returns true for configured RTL locales', () => {
    expect(isRTL('ar-SA')).toBe(true);
  });
});
