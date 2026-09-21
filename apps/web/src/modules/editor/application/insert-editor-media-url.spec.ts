import { canonicalizeMediaUrl, parseMediaEmbedUrl } from '@/shared/infrastructure/media-embed';

describe('insert media URL contract', () => {
  it('canonicalizes a valid Instagram URL for markdown storage', () => {
    const raw = 'www.instagram.com/p/DcncWF8DaIb/';
    expect(parseMediaEmbedUrl(raw)).not.toBeNull();
    expect(canonicalizeMediaUrl(raw)).toBe(
      'https://www.instagram.com/p/DcncWF8DaIb/',
    );
  });

  it('rejects non-media URLs', () => {
    expect(parseMediaEmbedUrl('https://example.com/video')).toBeNull();
    expect(
      parseMediaEmbedUrl('https://www.instagram.com/whitegarden_restaurant/'),
    ).toBeNull();
  });
});
