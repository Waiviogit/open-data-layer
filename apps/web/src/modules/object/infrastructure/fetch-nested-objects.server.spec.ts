/** @jest-environment node */

jest.mock('server-only', () => ({}));

jest.mock('@/config/env', () => ({
  env: { QUERY_API_URL: 'http://query-api.test' },
}));

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

import { headers } from 'next/headers';

import { fetchNestedObjectsBatch } from './fetch-nested-objects.server';

const INCOMING_XFF = '6.6.6.6, 1.2.3.4';

function outboundXff(): string | null {
  const init = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit | undefined;
  return init ? new Headers(init.headers).get('x-forwarded-for') : null;
}

describe('resolve-nested client IP forward', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (headers as jest.Mock).mockResolvedValue(
      new Headers({ 'x-forwarded-for': INCOMING_XFF }),
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('forwards the incoming X-Forwarded-For', async () => {
    await fetchNestedObjectsBatch(['obj-1'], { locale: 'en' });
    expect(outboundXff()).toBe(INCOMING_XFF);
  });
});
