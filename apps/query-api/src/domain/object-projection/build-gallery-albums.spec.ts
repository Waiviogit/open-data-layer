import { buildGalleryAlbums } from './build-gallery-albums';

describe('buildGalleryAlbums', () => {
  it('creates Photos album with avatar and orphan items', () => {
    const result = buildGalleryAlbums({
      imageGallery: ['Photos'],
      imageGalleryItem: [
        { album: 'Photos', url: 'https://example.com/a.jpg', rank_score: 5000 },
        { album: 'unknown-album', url: 'https://example.com/orphan.jpg', rank_score: 3000 },
      ],
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    expect(result.previewGallery.map((p) => p.url)).toEqual([
      'https://example.com/avatar.jpg',
      'https://example.com/a.jpg',
      'https://example.com/orphan.jpg',
    ]);
    expect(result.previewGallery[0]?.isAvatar).toBe(true);
    expect(result.albums.find((a) => a.name === 'Photos')?.items).toHaveLength(3);
  });

  it('synthesizes Photos album when missing from imageGallery', () => {
    const result = buildGalleryAlbums({
      imageGallery: ['Menu'],
      imageGalleryItem: [
        { album: 'orphan-id', url: 'https://example.com/o.jpg', rank_score: 100 },
      ],
      avatarUrl: 'https://example.com/av.jpg',
    });

    expect(result.albums.some((a) => a.name === 'Photos')).toBe(true);
    expect(result.previewGallery.map((p) => p.url)).toEqual([
      'https://example.com/av.jpg',
      'https://example.com/o.jpg',
    ]);
  });

  it('sorts non-avatar items by rank_score descending', () => {
    const result = buildGalleryAlbums({
      imageGallery: ['Photos'],
      imageGalleryItem: [
        { album: 'Photos', url: 'https://example.com/low.jpg', rank_score: 100 },
        { album: 'Photos', url: 'https://example.com/high.jpg', rank_score: 9000 },
      ],
      avatarUrl: null,
    });

    expect(result.previewGallery.map((p) => p.url)).toEqual([
      'https://example.com/high.jpg',
      'https://example.com/low.jpg',
    ]);
  });

  it('keeps gallery item update_id when avatar uses the same url', () => {
    const url = 'https://example.com/same.jpg';
    const result = buildGalleryAlbums({
      imageGallery: ['Photos'],
      imageGalleryItem: [{ album: 'Photos', url, rank_score: 500, update_id: 'g1' }],
      avatarUrl: url,
    });

    expect(result.previewGallery).toHaveLength(1);
    expect(result.previewGallery[0]?.update_id).toBe('g1');
    expect(result.previewGallery[0]?.isAvatar).toBe(false);
  });

  it('dedupes avatar URL when gallery item has no update_id', () => {
    const url = 'https://example.com/same.jpg';
    const result = buildGalleryAlbums({
      imageGallery: ['Photos'],
      imageGalleryItem: [{ album: 'Photos', url, rank_score: 500 }],
      avatarUrl: url,
    });

    expect(result.previewGallery).toHaveLength(1);
    expect(result.previewGallery[0]?.isAvatar).toBe(true);
  });

  it('returns empty preview when no photos', () => {
    const result = buildGalleryAlbums({
      imageGallery: [],
      imageGalleryItem: [],
      avatarUrl: null,
    });

    expect(result.previewGallery).toEqual([]);
    expect(result.albums.find((a) => a.name === 'Photos')?.items).toEqual([]);
  });
});
