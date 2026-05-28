import { LEGACY_THEME_COOKIE_ALIASES } from './theme-cookie.constants';

describe('LEGACY_THEME_COOKIE_ALIASES', () => {
  it('maps waivio cookie to light', () => {
    expect(LEGACY_THEME_COOKIE_ALIASES.waivio).toBe('light');
  });
});
