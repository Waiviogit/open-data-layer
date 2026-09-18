import { resolveSocialLinkHref } from './resolve-social-link-href';

describe('resolveSocialLinkHref', () => {
  it('passes through http(s) URLs unchanged', () => {
    const url = 'https://www.instagram.com/whitegarden_restaurant/';
    expect(resolveSocialLinkHref('instagram', url)).toBe(url);
    expect(resolveSocialLinkHref('instagram', 'http://example.com/profile')).toBe(
      'http://example.com/profile',
    );
  });

  it('prepends https for protocol-less URLs', () => {
    expect(resolveSocialLinkHref('instagram', 'www.instagram.com/whitegarden_restaurant/')).toBe(
      'https://www.instagram.com/whitegarden_restaurant/',
    );
    expect(resolveSocialLinkHref('instagram', 'instagram.com/whitegarden_restaurant/')).toBe(
      'https://instagram.com/whitegarden_restaurant/',
    );
    expect(resolveSocialLinkHref('instagram', '//www.instagram.com/whitegarden_restaurant/')).toBe(
      'https://www.instagram.com/whitegarden_restaurant/',
    );
  });

  it('maps account handles to platform URLs', () => {
    expect(resolveSocialLinkHref('instagram', 'whitegarden_restaurant')).toBe(
      'https://instagram.com/whitegarden_restaurant',
    );
    expect(resolveSocialLinkHref('twitter', 'x')).toBe('https://x.com/x');
    expect(resolveSocialLinkHref('youtube', 'ch')).toBe('https://www.youtube.com/@ch');
    expect(resolveSocialLinkHref('hive', 'acc')).toBe('https://peakd.com/@acc');
  });

  it('does not treat dotted handles as URLs', () => {
    expect(resolveSocialLinkHref('instagram', 'user.name')).toBe('https://instagram.com/user.name');
  });

  it('falls back to platform mapping for unsafe schemes', () => {
    expect(resolveSocialLinkHref('instagram', 'javascript:alert(1)')).toBe(
      'https://instagram.com/javascript%3Aalert(1)',
    );
  });
});
