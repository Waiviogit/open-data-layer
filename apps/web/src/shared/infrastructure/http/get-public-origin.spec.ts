import { buildPublicUrl, getPublicOrigin } from './get-public-origin';

describe('getPublicOrigin', () => {
  function req(
    url: string,
    headers: Record<string, string> = {},
  ): Request {
    return new Request(url, { headers });
  }

  it('prefers configured origin', () => {
    expect(
      getPublicOrigin(
        req('http://0.0.0.0:3000/api/auth/callback/hivesigner'),
        'https://waiviodev.com',
      ),
    ).toBe('https://waiviodev.com');
  });

  it('uses forwarded host and proto when configured origin is missing', () => {
    expect(
      getPublicOrigin(
        req('http://0.0.0.0:3000/sign-in', {
          host: '0.0.0.0:3000',
          'x-forwarded-host': 'waiviodev.com',
          'x-forwarded-proto': 'https',
        }),
      ),
    ).toBe('https://waiviodev.com');
  });

  it('uses host header when not internal', () => {
    expect(
      getPublicOrigin(
        req('http://localhost:3000/', {
          host: 'localhost:3000',
        }),
      ),
    ).toBe('http://localhost:3000');
  });

  it('falls back to localhost when request origin is internal', () => {
    expect(getPublicOrigin(req('http://0.0.0.0:3000/'))).toBe(
      'http://localhost:3000',
    );
  });
});

describe('buildPublicUrl', () => {
  it('builds redirect URL from configured origin', () => {
    const url = buildPublicUrl(
      new Request('http://0.0.0.0:3000/api/auth/callback/hivesigner'),
      '/?auth=ok',
      'https://waiviodev.com',
    );
    expect(url.toString()).toBe('https://waiviodev.com/?auth=ok');
  });
});
