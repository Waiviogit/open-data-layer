/** @jest-environment node */

jest.mock('server-only', () => ({}));

jest.mock('@/config/env', () => ({
  env: { QUERY_API_URL: 'http://query-api.test' },
}));

jest.mock('@/i18n/runtime/get-request-locale', () => ({
  getRequestLocale: jest.fn().mockResolvedValue('en'),
}));

jest.mock('@/shared/infrastructure/auth/cookie-auth-context-provider', () => ({
  createCookieAuthContextProvider: () => ({
    getUser: jest.fn().mockResolvedValue(null),
  }),
}));

import { NextRequest } from 'next/server';

import { GET } from './route';

function upstreamHeaders(): Headers {
  const init = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit;
  return new Headers(init.headers);
}

describe('GET /api/discover/objects', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('copies incoming X-Forwarded-For to query-api', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ items: [], cursor: null, hasMore: false }),
      headers: { get: () => 'application/json' },
    }) as typeof fetch;

    const request = new NextRequest('http://localhost/api/discover/objects?object_type=product', {
      headers: { 'x-forwarded-for': '6.6.6.6, 1.2.3.4' },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(upstreamHeaders().get('x-forwarded-for')).toBe('6.6.6.6, 1.2.3.4');
    const upstreamUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(upstreamUrl).toContain('/query/v1/discover/objects');
  });

  it('does not invent X-Forwarded-For from X-Real-IP', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ items: [], cursor: null, hasMore: false }),
      headers: { get: () => 'application/json' },
    }) as typeof fetch;

    const request = new NextRequest('http://localhost/api/discover/objects?object_type=product', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    await GET(request);

    expect(upstreamHeaders().get('x-forwarded-for')).toBeNull();
  });
});
