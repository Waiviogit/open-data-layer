import { extractThumbnailUrl } from './post-thumbnail';

describe('extractThumbnailUrl', () => {
  it('returns first image from json_metadata.image array', () => {
    const meta = JSON.stringify({ image: ['https://example.com/a.jpg', 'https://b.jpg'] });
    expect(extractThumbnailUrl(meta, '')).toBe('https://example.com/a.jpg');
  });

  it('falls back to markdown image in body', () => {
    expect(extractThumbnailUrl('', 'Hello ![alt](https://md.io/x.png) end')).toBe('https://md.io/x.png');
  });

  it('falls back to HTML img in body', () => {
    expect(extractThumbnailUrl('', '<p><img src="https://html.io/y.jpg" /></p>')).toBe(
      'https://html.io/y.jpg',
    );
  });

  it('returns null when nothing found', () => {
    expect(extractThumbnailUrl('', 'no images')).toBeNull();
  });

  it('prefers json_metadata over body', () => {
    const meta = JSON.stringify({ image: ['https://meta.first/img'] });
    expect(extractThumbnailUrl(meta, '![](https://body.only/img)')).toBe('https://meta.first/img');
  });
});
