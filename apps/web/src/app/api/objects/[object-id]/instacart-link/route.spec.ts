/** @jest-environment node */

jest.mock('server-only', () => ({}));

jest.mock('@/config/env', () => ({
  env: { QUERY_API_URL: 'http://query-api.test' },
}));

jest.mock('@/i18n/runtime/get-request-locale', () => ({
  getRequestLocale: jest.fn().mockResolvedValue('en-US'),
}));

import { NextRequest } from 'next/server';

import { GET } from './route';

function upstreamHeaders(): Headers {
  const init = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit;
  return new Headers(init.headers);
}

describe('GET /api/objects/:id/instacart-link', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('forwards locale and client IP and returns the query-api url', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ url: 'https://www.instacart.com' }),
      headers: { get: () => 'application/json' },
    }) as typeof fetch;

    const request = new NextRequest('http://localhost/api/objects/recipe-1/instacart-link', {
      headers: {
        'accept-language': 'en-US',
        'x-locale': 'en-US',
        'x-forwarded-for': '6.6.6.6',
      },
    });
    const response = await GET(request, {
      params: Promise.resolve({ 'object-id': 'recipe-1' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://www.instacart.com' });
    const upstreamUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(upstreamUrl).toBe(
      'http://query-api.test/query/v1/objects/recipe-1/instacart-link',
    );
    expect(upstreamHeaders().get('accept-language')).toBe('en-US');
    expect(upstreamHeaders().get('x-locale')).toBe('en-US');
    expect(upstreamHeaders().get('x-forwarded-for')).toBe('6.6.6.6');
  });
});
