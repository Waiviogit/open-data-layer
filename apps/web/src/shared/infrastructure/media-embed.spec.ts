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
      parseMediaEmbedUrl('https://www.youtube.com/shorts/abcdefghijk')?.embedSrc,
    ).toBe('https://www.youtube.com/embed/abcdefghijk');
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
