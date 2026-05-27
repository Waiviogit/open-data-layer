/** Comma-separated nested object ids in the center column (list/page stack). */
export const OBJECT_PAGE_VIEW_PATH_PARAM = 'path';

/** Path segment and `?tab=` value for full description in the center column. */
export const OBJECT_PAGE_DESCRIPTION_SEGMENT = 'description';

/**
 * Primary tabs exposed as `/object/:id/<segment>` (proxy rewrites to `?tab=` internally).
 * Gallery and experts were previously `?tab=` only; all listed segments use clean paths.
 */
export const OBJECT_PAGE_PATH_TAB_SEGMENTS = [
  'reviews',
  'updates',
  'followers',
  'authority',
  OBJECT_PAGE_DESCRIPTION_SEGMENT,
  'gallery',
  'experts',
] as const;

export type ObjectPagePathTabSegment = (typeof OBJECT_PAGE_PATH_TAB_SEGMENTS)[number];

/** Internal query param when proxy rewrites `/object/:id/gallery/album/:name`. */
export const OBJECT_PAGE_GALLERY_ALBUM_PARAM = 'gallery_album';

/** Path segment between `/gallery/` and album name. */
export const OBJECT_PAGE_GALLERY_ALBUM_PATH_SEGMENT = 'album';

export function buildObjectGalleryAlbumPath(
  objectId: string,
  albumName: string,
): string {
  return `/object/${encodeURIComponent(objectId)}/gallery/${OBJECT_PAGE_GALLERY_ALBUM_PATH_SEGMENT}/${encodeURIComponent(albumName)}`;
}

export function buildObjectGalleryPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}/gallery`;
}
