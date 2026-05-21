jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
}));

import {
  fetchSessionTokenPairFromAuthApi,
  resolveProxySessionRefresh,
} from './refresh-session';
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

  it('deduplicates parallel refresh calls for the same token', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  accessToken: 'access',
                  refreshToken: 'refresh',
                  user: { username: 'alice' },
                }),
              } as Response),
            10,
          );
        }),
    );

    const token = 'same-refresh-token';
    const [a, b] = await Promise.all([
      fetchSessionTokenPairFromAuthApi(token, null, env),
      fetchSessionTokenPairFromAuthApi(token, null, env),
    ]);

    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

describe('resolveProxySessionRefresh', () => {
  const jwtSecret = 'test-jwt-secret-min-16';

  function requestWithCookies(access?: string, refresh?: string) {
    return {
      cookies: {
        get: (name: string) => {
          if (name === 'odl_access' && access) {
            return { value: access };
          }
          if (name === 'odl_refresh' && refresh) {
            return { value: refresh };
          }
          return undefined;
        },
      },
      headers: { get: () => null },
    } as unknown as import('next/server').NextRequest;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not clear cookies when refresh JWT is still valid but auth-api rejects (rotation race)', async () => {
    const { jwtVerify } = await import('jose');
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { typ: 'refresh', sub: 'alice', jti: 'session-1' },
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const result = await resolveProxySessionRefresh(
      requestWithCookies(undefined, 'refresh-jwt'),
      jwtSecret,
    );

    expect(result).toEqual({ kind: 'unchanged' });
  });
});
