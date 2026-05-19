import { shouldSkipProxySessionRefresh } from './proxy-session-paths';
import { parseAuthApiTokenResponse } from './session-tokens';

describe('shouldSkipProxySessionRefresh', () => {
  it('skips auth BFF routes', () => {
    expect(shouldSkipProxySessionRefresh('/api/auth/refresh')).toBe(true);
    expect(shouldSkipProxySessionRefresh('/api/auth/logout')).toBe(true);
  });

  it('skips Next internals', () => {
    expect(shouldSkipProxySessionRefresh('/_next/static/chunk.js')).toBe(true);
  });

  it('runs for app pages and other API routes', () => {
    expect(shouldSkipProxySessionRefresh('/')).toBe(false);
    expect(shouldSkipProxySessionRefresh('/api/search')).toBe(false);
  });
});

describe('parseAuthApiTokenResponse', () => {
  it('requires access, refresh, and username', () => {
    expect(
      parseAuthApiTokenResponse({
        accessToken: 'a',
        refreshToken: 'r',
        user: { username: 'alice' },
      }),
    ).toEqual({
      accessToken: 'a',
      refreshToken: 'r',
      user: { username: 'alice' },
    });
  });

  it('returns null when any field is missing', () => {
    expect(
      parseAuthApiTokenResponse({
        accessToken: 'a',
        refreshToken: 'r',
      }),
    ).toBeNull();
  });
});
