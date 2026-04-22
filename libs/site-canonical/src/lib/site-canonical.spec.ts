import { buildFallbackCanonicalUrl } from './fallback';
import { extractWebsiteFromPostingJson } from './posting-website';
import { isAllowedPublicHttpsUrl } from './ssrf-guard';
import { normalizeWebsiteToHttpsUrl } from './normalize-website';
import { runSiteCanonicalPipeline } from './pipeline';

describe('buildFallbackCanonicalUrl', () => {
  it('builds https object path', () => {
    expect(
      buildFallbackCanonicalUrl('obj-1', 'https://fallback.example.com'),
    ).toBe('https://fallback.example.com/object/obj-1');
  });
});

describe('extractWebsiteFromPostingJson', () => {
  it('parses website string', () => {
    expect(
      extractWebsiteFromPostingJson(
        JSON.stringify({ profile: { website: 'x' }, website: 'https://a.com' }),
      ),
    ).toBe('https://a.com');
  });
  it('returns null for invalid', () => {
    expect(extractWebsiteFromPostingJson('notjson')).toBeNull();
  });
});

describe('normalize and SSRF', () => {
  it('adds https', () => {
    expect(normalizeWebsiteToHttpsUrl('example.com')).toBe('https://example.com/');
  });
  it('rejects private hostnames only when IP', () => {
    const u = new URL('https://8.8.8.8/');
    expect(isAllowedPublicHttpsUrl(u).ok).toBe(false);
  });
});

describe('runSiteCanonicalPipeline', () => {
  it('uses fallback when no website', async () => {
    const r = await runSiteCanonicalPipeline({
      objectId: 'o1',
      postingJsonMetadata: '{}',
      fallbackOrigin: 'https://fb.example.com',
    });
    expect(r.usedFallback).toBe(true);
    expect(r.canonicalUrl).toBe('https://fb.example.com/object/o1');
  });
});
