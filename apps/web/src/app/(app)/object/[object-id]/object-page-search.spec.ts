import {
  OBJECT_PAGE_DESCRIPTION_SEGMENT,
  OBJECT_PAGE_PRIMARY_TAB_PARAM,
  OBJECT_PAGE_VIEW_PATH_PARAM,
  resolveGalleryAlbumForObjectPage,
  resolveGalleryAlbumFromObjectUrl,
  resolvePrimarySegmentForObjectPage,
  resolvePrimarySegmentFromObjectUrl,
} from './object-page-search';

describe('resolvePrimarySegmentForObjectPage', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('returns explicit path segment reviews', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/reviews`,
        new URLSearchParams(),
        '',
      ),
    ).toBe('reviews');
  });

  it('returns explicit path segment description', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/description`,
        new URLSearchParams(),
        '',
      ),
    ).toBe(OBJECT_PAGE_DESCRIPTION_SEGMENT);
  });

  it('returns explicit path segment gallery', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/gallery`,
        new URLSearchParams(),
        '',
      ),
    ).toBe('gallery');
  });

  it('returns explicit path segment experts', () => {
    expect(
      resolvePrimarySegmentForObjectPage(
        objectId,
        `${base}/experts`,
        new URLSearchParams(),
        '',
      ),
    ).toBe('experts');
  });

  it('returns explicit ?tab= over default landing', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_PRIMARY_TAB_PARAM, 'updates');
    expect(resolvePrimarySegmentForObjectPage(objectId, base, sp, 'reviews')).toBe('updates');
  });

  it('returns empty segment when ?path= is present on clean pathname', () => {
    const sp = new URLSearchParams();
    sp.set(OBJECT_PAGE_VIEW_PATH_PARAM, 'nested-list');
    expect(resolvePrimarySegmentForObjectPage(objectId, base, sp, 'reviews')).toBe('');
  });

  it('falls back to default landing segment on clean URL', () => {
    expect(
      resolvePrimarySegmentForObjectPage(objectId, base, new URLSearchParams(), 'reviews'),
    ).toBe('reviews');
  });

  it('falls back to empty segment on clean URL for nested default landing', () => {
    expect(
      resolvePrimarySegmentForObjectPage(objectId, base, new URLSearchParams(), ''),
    ).toBe('');
  });
});

describe('resolvePrimarySegmentFromObjectUrl', () => {
  it('returns empty for bare object path', () => {
    expect(
      resolvePrimarySegmentFromObjectUrl('abc', '/object/abc', new URLSearchParams()),
    ).toBe('');
  });

  it('returns gallery for album drill-down path', () => {
    expect(
      resolvePrimarySegmentFromObjectUrl(
        'abc',
        '/object/abc/gallery/album/Photos',
        new URLSearchParams(),
      ),
    ).toBe('gallery');
  });
});

describe('resolveGalleryAlbumFromObjectUrl', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('returns null on albums list path', () => {
    expect(resolveGalleryAlbumFromObjectUrl(objectId, `${base}/gallery`)).toBeNull();
  });

  it('decodes album name from path', () => {
    expect(
      resolveGalleryAlbumFromObjectUrl(objectId, `${base}/gallery/album/Photos`),
    ).toBe('Photos');
  });

  it('decodes encoded album names', () => {
    expect(
      resolveGalleryAlbumFromObjectUrl(
        objectId,
        `${base}/gallery/album/${encodeURIComponent('My album')}`,
      ),
    ).toBe('My album');
  });

  it('returns null for unrelated paths', () => {
    expect(resolveGalleryAlbumFromObjectUrl(objectId, `${base}/reviews`)).toBeNull();
  });
});

describe('resolveGalleryAlbumForObjectPage', () => {
  const objectId = 'test-obj';
  const base = `/object/${encodeURIComponent(objectId)}`;

  it('prefers pathname over query param', () => {
    const sp = new URLSearchParams();
    sp.set('gallery_album', 'Other');
    expect(
      resolveGalleryAlbumForObjectPage(
        objectId,
        `${base}/gallery/album/Photos`,
        sp,
      ),
    ).toBe('Photos');
  });

  it('falls back to query param when pathname has no album', () => {
    const sp = new URLSearchParams();
    sp.set('gallery_album', encodeURIComponent('Menu shots'));
    expect(resolveGalleryAlbumForObjectPage(objectId, `${base}/gallery`, sp)).toBe(
      'Menu shots',
    );
  });
});
