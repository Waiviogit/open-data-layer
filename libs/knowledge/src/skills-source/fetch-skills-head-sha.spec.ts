import { fetchSkillsHeadSha } from './fetch-skills-head-sha';
import { SkillsSourceError } from './skills-source-error';

const SHA = 'a'.repeat(40);

describe('fetchSkillsHeadSha', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns unchanged on 304', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      new Response(null, { status: 304 }),
    ) as typeof fetch;

    const result = await fetchSkillsHeadSha({ etag: '"abc"' });

    expect(result).toEqual({ status: 'unchanged' });
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>)['If-None-Match']).toBe('"abc"');
  });

  it('returns sha and etag on 200', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      new Response(SHA, {
        status: 200,
        headers: { etag: '"etag-1"' },
      }),
    ) as typeof fetch;

    const result = await fetchSkillsHeadSha();

    expect(result).toEqual({ status: 'changed', sha: SHA, etag: '"etag-1"' });
  });

  it('throws invalid_sha when body is not a digest', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      new Response('not-a-sha', { status: 200 }),
    ) as typeof fetch;

    await expect(fetchSkillsHeadSha()).rejects.toMatchObject({
      code: 'invalid_sha',
    } satisfies Partial<SkillsSourceError>);
  });

  it('maps 403 and 429 to rate_limit', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      new Response('nope', { status: 403 }),
    ) as typeof fetch;

    await expect(fetchSkillsHeadSha()).rejects.toMatchObject({ code: 'rate_limit' });

    globalThis.fetch = jest.fn().mockResolvedValue(
      new Response('nope', { status: 429 }),
    ) as typeof fetch;

    await expect(fetchSkillsHeadSha()).rejects.toMatchObject({ code: 'rate_limit' });
  });

  it('maps abort to timeout', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    globalThis.fetch = jest.fn().mockRejectedValue(abort) as typeof fetch;

    await expect(fetchSkillsHeadSha()).rejects.toMatchObject({ code: 'timeout' });
  });
});
