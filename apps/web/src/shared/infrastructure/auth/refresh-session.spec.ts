jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
}));

import { fetchSessionTokenPairFromAuthApi } from './refresh-session';
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

describe('fetchSessionTokenPairFromAuthApi', () => {
  const env = { AUTH_API_BASE_URL: 'http://auth.test' };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns unavailable when fetch throws (auth-api down)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    const result = await fetchSessionTokenPairFromAuthApi('refresh-token', null, env);

    expect(result).toEqual({ status: 'unavailable' });
  });

  it('returns auth_failed when response is not ok', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const result = await fetchSessionTokenPairFromAuthApi('refresh-token', null, env);

    expect(result).toEqual({ status: 'auth_failed' });
  });

  it('returns ok with tokens on success', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'access',
        refreshToken: 'refresh',
        user: { username: 'alice' },
      }),
    } as Response);

    const result = await fetchSessionTokenPairFromAuthApi('refresh-token', null, env);

    expect(result).toEqual({
      status: 'ok',
      tokens: {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: { username: 'alice' },
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://auth.test/auth/v1/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
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
