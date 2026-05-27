import { projectedObjectWithCountsToPageModel } from './projected-object-to-page-model';
import type { ProjectedObjectWithCountsView } from './object-resolve.types';

describe('projectedObjectWithCountsToPageModel gallery', () => {
  it('maps root-level galleryAlbums and previewGallery from resolve payload', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'test-obj',
      object_type: 'person',
      semantic_type: 'schema:Person',
      weight: 1,
      fields: {
        name: 'Test',
        imageGallery: ['Photos'],
        imageGalleryItem: [
          { album: 'Photos', url: 'https://example.com/a.jpg', rank_score: 100 },
        ],
      },
      previewGallery: [
        { url: 'https://example.com/a.jpg', rankScore: 100, isAvatar: false },
      ],
      galleryAlbums: [
        {
          name: 'Photos',
          items: [
            { url: 'https://example.com/a.jpg', rankScore: 100, isAvatar: false },
          ],
        },
      ],
      followers_count: 0,
      posts_count: 0,
      updates_count: 0,
      administrative_count: 0,
      ownership_count: 0,
      is_following: false,
      viewer_bell: false,
      update_type_counts: {},
    };

    const model = projectedObjectWithCountsToPageModel(api);

    expect(model.galleryAlbums).toEqual([
      {
        name: 'Photos',
        items: [
          { url: 'https://example.com/a.jpg', rankScore: 100, isAvatar: false },
        ],
      },
    ]);
    expect(model.previewGallery).toEqual([
      { url: 'https://example.com/a.jpg', rankScore: 100, isAvatar: false },
    ]);
  });

  it('omits left-rail gallery block when previewGallery is avatar-only', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'test-obj',
      object_type: 'person',
      semantic_type: 'schema:Person',
      weight: 1,
      fields: { name: 'Test' },
      previewGallery: [
        { url: 'https://example.com/avatar.jpg', rankScore: 100, isAvatar: true },
      ],
      galleryAlbums: [],
      followers_count: 0,
      posts_count: 0,
      updates_count: 0,
      administrative_count: 0,
      ownership_count: 0,
      is_following: false,
      viewer_bell: false,
      update_type_counts: {},
    };

    const model = projectedObjectWithCountsToPageModel(api);

    expect(model.leftRailBlocks.some((block) => block.kind === 'gallery')).toBe(false);
    expect(model.previewGallery).toHaveLength(1);
  });

  it('left-rail gallery block excludes avatar rows from carousel photos', () => {
    const api: ProjectedObjectWithCountsView = {
      object_id: 'test-obj',
      object_type: 'person',
      semantic_type: 'schema:Person',
      weight: 1,
      fields: { name: 'Test' },
      previewGallery: [
        { url: 'https://example.com/avatar.jpg', rankScore: 100, isAvatar: true },
        { url: 'https://example.com/a.jpg', rankScore: 90, isAvatar: false },
      ],
      galleryAlbums: [],
      followers_count: 0,
      posts_count: 0,
      updates_count: 0,
      administrative_count: 0,
      ownership_count: 0,
      is_following: false,
      viewer_bell: false,
      update_type_counts: {},
    };

    const model = projectedObjectWithCountsToPageModel(api);
    const galleryBlock = model.leftRailBlocks.find((block) => block.kind === 'gallery');

    expect(galleryBlock).toMatchObject({
      kind: 'gallery',
      photos: [{ url: 'https://example.com/a.jpg', rankScore: 90, isAvatar: false }],
    });
  });
});
