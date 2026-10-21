/** @jest-environment node */

jest.mock('server-only', () => ({}));

jest.mock('@/config/env', () => ({
  env: { QUERY_API_URL: 'http://query-api.test' },
}));

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

import { headers } from 'next/headers';

import { fetchShopObjects, fetchShopSections } from './shop-objects.client';

const INCOMING_XFF = '6.6.6.6, 1.2.3.4';

function outboundXff(): string | null {
  const init = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit | undefined;
  return init ? new Headers(init.headers).get('x-forwarded-for') : null;
}

describe('shop objects client IP forward', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (headers as jest.Mock).mockResolvedValue(
      new Headers({ 'x-forwarded-for': INCOMING_XFF }),
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], cursor: null, hasMore: false, sections: [] }),
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('forwards the incoming X-Forwarded-For on shop objects', async () => {
    await fetchShopObjects('alice', { types: ['product'], categoryPath: [] });
    expect(outboundXff()).toBe(INCOMING_XFF);
  });

  it('forwards the incoming X-Forwarded-For on shop sections', async () => {
    await fetchShopSections('alice', { types: ['product'] });
    expect(outboundXff()).toBe(INCOMING_XFF);
  });
});
