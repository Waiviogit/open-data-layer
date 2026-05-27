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
});
