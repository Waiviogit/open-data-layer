import {
  canonicalizeMediaUrl,
  isProviderEmbedSrc,
  mediaEmbedIframeHtml,
  parseMediaEmbedUrl,
} from './media-embed';

describe('parseMediaEmbedUrl', () => {
  it('embeds Instagram /p/ URLs including the WHITE GARDEN example', () => {
    expect(
      parseMediaEmbedUrl('https://www.instagram.com/p/DcncWF8DaIb/'),
    ).toEqual({
      provider: 'instagram',
      embedSrc: 'https://www.instagram.com/p/DcncWF8DaIb/embed',
      wrapperClass: 'blog-post-instagram-embed',
      title: 'Instagram post',
    });
  });

  it('embeds Instagram reels and tv posts', () => {
    expect(parseMediaEmbedUrl('https://instagram.com/reel/AbCdEfGhIjK')).toEqual(
      expect.objectContaining({
        provider: 'instagram',
        embedSrc: 'https://www.instagram.com/reel/AbCdEfGhIjK/embed',
      }),
    );
    expect(
      parseMediaEmbedUrl('https://www.instagram.com/tv/AbCdEfGhIjK/?utm_source=ig'),
    ).toEqual(
      expect.objectContaining({
        embedSrc: 'https://www.instagram.com/tv/AbCdEfGhIjK/embed',
      }),
    );
  });

  it('strips query strings and still embeds', () => {
    expect(
      parseMediaEmbedUrl(
        'https://www.instagram.com/p/DcncWF8DaIb/?img_index=1&utm_source=ig',
      )?.embedSrc,
    ).toBe('https://www.instagram.com/p/DcncWF8DaIb/embed');
  });

  it('parses an already-embed Instagram URL without nesting path segments', () => {
    expect(
      parseMediaEmbedUrl('https://www.instagram.com/p/DcncWF8DaIb/embed'),
    ).toEqual(
      expect.objectContaining({
        embedSrc: 'https://www.instagram.com/p/DcncWF8DaIb/embed',
      }),
    );
  });

  it('rejects Instagram profile URLs', () => {
    expect(
      parseMediaEmbedUrl('https://www.instagram.com/whitegarden_restaurant/'),
    ).toBeNull();
    expect(parseMediaEmbedUrl('https://instagram.com/p/')).toBeNull();
    expect(parseMediaEmbedUrl('https://www.instagram.com/explore/')).toBeNull();
  });

  it('embeds YouTube watch, youtu.be, and shorts', () => {
    expect(
      parseMediaEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.embedSrc,
    ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(parseMediaEmbedUrl('https://youtu.be/abcdefghijk')?.embedSrc).toBe(
      'https://www.youtube.com/embed/abcdefghijk',
    );
    expect(
      parseMediaEmbedUrl('https://www.youtube.com/shorts/abcdefghijk'),
    ).toEqual(
      expect.objectContaining({
        embedSrc: 'https://www.youtube.com/embed/abcdefghijk',
        wrapperClass: 'blog-post-youtube-embed blog-post-youtube-embed--portrait',
      }),
    );
  });

  it('embeds TikTok share URLs in a portrait player', () => {
    expect(
      parseMediaEmbedUrl(
        'https://www.tiktok.com/@paulchefstudio/video/7660467808018386206',
      ),
    ).toEqual({
      provider: 'tiktok',
      embedSrc: 'https://www.tiktok.com/player/v1/7660467808018386206',
      wrapperClass: 'blog-post-tiktok-embed',
      title: 'TikTok video',
    });
  });

  it('embeds Facebook watch and reel URLs', () => {
    expect(parseMediaEmbedUrl('https://www.facebook.com/watch/?v=1234567890')).toEqual(
      expect.objectContaining({
        provider: 'facebook',
        wrapperClass: 'blog-post-facebook-embed',
        title: 'Facebook video',
      }),
    );
    expect(parseMediaEmbedUrl('https://www.facebook.com/reel/9876543210')).toEqual(
      expect.objectContaining({
        provider: 'facebook',
        wrapperClass: 'blog-post-facebook-embed blog-post-facebook-embed--portrait',
      }),
    );
  });

  it('embeds LinkedIn activity URNs including truncated excerpt URLs', () => {
    expect(
      parseMediaEmbedUrl(
        'https://www.linkedin.com/embed/feed/update/urn:li:activity:7514384350902194176\u2026?_l=ru_RU',
      ),
    ).toEqual({
      provider: 'linkedin',
      embedSrc:
        'https://www.linkedin.com/embed/feed/update/urn:li:activity:7514384350902194176',
      wrapperClass: 'blog-post-linkedin-embed',
      title: 'LinkedIn post',
    });
  });

  it('embeds X status URLs', () => {
    expect(
      parseMediaEmbedUrl('https://x.com/foodster/status/1234567890123456789'),
    ).toEqual({
      provider: 'x',
      embedSrc:
        'https://platform.twitter.com/embed/Tweet.html?id=1234567890123456789',
      wrapperClass: 'blog-post-x-embed',
      title: 'X post',
    });
  });

  it('accepts protocol-relative and scheme-less Instagram URLs', () => {
    expect(parseMediaEmbedUrl('//www.instagram.com/p/DcncWF8DaIb/')?.embedSrc).toBe(
      'https://www.instagram.com/p/DcncWF8DaIb/embed',
    );
    expect(parseMediaEmbedUrl('instagram.com/p/DcncWF8DaIb')?.embedSrc).toBe(
      'https://www.instagram.com/p/DcncWF8DaIb/embed',
    );
  });
});

describe('canonicalizeMediaUrl', () => {
  it('decodes HTML entities and strips trailing punctuation', () => {
    expect(
      canonicalizeMediaUrl(
        'https://www.instagram.com/p/DcncWF8DaIb/?img_index=1&amp;utm=1).',
      ),
    ).toBe('https://www.instagram.com/p/DcncWF8DaIb/?img_index=1&utm=1');
  });
});

describe('isProviderEmbedSrc', () => {
  it('detects YouTube and Instagram embed srcs', () => {
    expect(isProviderEmbedSrc('https://www.youtube.com/embed/abcdefghijk')).toBe(
      true,
    );
    expect(
      isProviderEmbedSrc('https://www.instagram.com/p/DcncWF8DaIb/embed'),
    ).toBe(true);
    expect(
      isProviderEmbedSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe(false);
    expect(
      isProviderEmbedSrc('https://www.instagram.com/p/DcncWF8DaIb/'),
    ).toBe(false);
    expect(
      isProviderEmbedSrc('https://www.tiktok.com/player/v1/7660467808018386206'),
    ).toBe(true);
    expect(
      isProviderEmbedSrc(
        'https://www.tiktok.com/@paulchefstudio/video/7660467808018386206',
      ),
    ).toBe(false);
    expect(
      isProviderEmbedSrc(
        'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D1',
      ),
    ).toBe(true);
    expect(
      isProviderEmbedSrc(
        'https://platform.twitter.com/embed/Tweet.html?id=1234567890123456789',
      ),
    ).toBe(true);
    expect(
      isProviderEmbedSrc(
        'https://www.linkedin.com/embed/feed/update/urn:li:activity:7514384350902194176',
      ),
    ).toBe(true);
  });
});

describe('mediaEmbedIframeHtml', () => {
  it('wraps Instagram in a portrait container', () => {
    const parsed = parseMediaEmbedUrl(
      'https://www.instagram.com/p/DcncWF8DaIb/',
    );
    expect(parsed).not.toBeNull();
    const html = mediaEmbedIframeHtml(parsed!);
    expect(html).toContain('blog-post-instagram-embed');
    expect(html).toContain(
      'src="https://www.instagram.com/p/DcncWF8DaIb/embed"',
    );
    expect(html).toContain('scrolling="no"');
  });
});
