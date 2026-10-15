/** @jest-environment node */

jest.mock('server-only', () => ({}));

import { NextRequest } from 'next/server';

import { GET } from './route';

const VIDEO_ID = '7660467808018386206';
const THUMB =
  'https://p16.muscdn.com/obj/tos-maliva-p-0068/06kv6rfcesljdjr45ukb0000d844090v0200010605';

describe('GET /api/video-preview/tiktok', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns 400 for a non-numeric id', async () => {
    global.fetch = jest.fn() as typeof fetch;
    const request = new NextRequest(
      'http://localhost/api/video-preview/tiktok?id=not-an-id',
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns the oEmbed thumbnail URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ thumbnail_url: THUMB }),
    }) as typeof fetch;

    const request = new NextRequest(
      `http://localhost/api/video-preview/tiktok?id=${VIDEO_ID}`,
    );
    const response = await GET(request);
    const body = (await response.json()) as { thumbnailUrl: string };

    expect(response.status).toBe(200);
    expect(body.thumbnailUrl).toBe(THUMB);
    expect(response.headers.get('Cache-Control')).toContain('max-age=3600');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const upstreamUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(upstreamUrl).toContain('www.tiktok.com/oembed');
    expect(upstreamUrl).toContain(VIDEO_ID);
  });

  it('returns 502 when oEmbed fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as typeof fetch;
    const request = new NextRequest(
      `http://localhost/api/video-preview/tiktok?id=${VIDEO_ID}`,
    );
    const response = await GET(request);
    expect(response.status).toBe(502);
  });

  it('returns 502 when oEmbed times out', async () => {
    const timeout = new Error('Timeout');
    timeout.name = 'TimeoutError';
    global.fetch = jest.fn().mockRejectedValue(timeout) as typeof fetch;
    const request = new NextRequest(
      `http://localhost/api/video-preview/tiktok?id=${VIDEO_ID}`,
    );
    const response = await GET(request);
    expect(response.status).toBe(502);
  });

  it('rejects a non-TikTok thumbnail host', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ thumbnail_url: 'https://evil.example/thumb.jpg' }),
    }) as typeof fetch;
    const request = new NextRequest(
      `http://localhost/api/video-preview/tiktok?id=${VIDEO_ID}`,
    );
    const response = await GET(request);
    expect(response.status).toBe(502);
  });
});
