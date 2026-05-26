import { resolveOgImageUrl } from './og-image';
import { toAbsoluteUrl } from './to-absolute-url';

describe('toAbsoluteUrl', () => {
  it('returns absolute https URLs unchanged', () => {
    expect(toAbsoluteUrl('https://cdn.example/a.jpg', 'https://site.com')).toBe(
      'https://cdn.example/a.jpg',
    );
  });

  it('resolves relative paths against origin', () => {
    expect(toAbsoluteUrl('/images/a.jpg', 'https://site.com')).toBe(
      'https://site.com/images/a.jpg',
    );
  });

  it('returns null for empty values or missing origin', () => {
    expect(toAbsoluteUrl('', 'https://site.com')).toBeNull();
    expect(toAbsoluteUrl('/x', null)).toBeNull();
  });
});

describe('resolveOgImageUrl', () => {
  const origin = 'https://site.com';

  it('picks first valid candidate', () => {
    expect(
      resolveOgImageUrl([null, '/cover.jpg', '/avatar.jpg'], origin),
    ).toBe('https://site.com/cover.jpg');
  });

  it('falls back to default OG image', () => {
    expect(resolveOgImageUrl([], origin)).toBe(
      'https://site.com/opengraph-image.png',
    );
  });
});
