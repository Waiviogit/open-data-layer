import {
  FIELD_REFERENCE_PATH_SEGMENTS,
  isFieldReferencePathSegment,
  resolveFieldReferencePathSegmentFromType,
  resolveFieldReferenceTypeFromPathSegment,
} from './field-reference-rules';

/** Comma-separated nested object ids in the center column (list/page stack). */
export const OBJECT_PAGE_VIEW_PATH_PARAM = 'path';

/** Path segment and `?tab=` value for full description in the center column. */
export const OBJECT_PAGE_DESCRIPTION_SEGMENT = 'description';

/**
 * Primary tab segment for the default object landing at clean `/object/:id`.
 * Not in {@link OBJECT_PAGE_PATH_TAB_SEGMENTS} — no `/details` public path.
 */
export const DETAILS_PRIMARY_TAB_SEGMENT = 'details';

/** Host types that use a type-specific leading tab/content instead of Details. */
export const OBJECT_TYPES_WITHOUT_DETAILS_TAB = new Set([
  'list',
  'widget',
  'page',
  'html',
  'legal_document',
  'skill',
  'newsfeed',
  'webpage',
  'map',
  'shop',
  'group',
]);

export function objectTypeHasDetailsTab(objectTypeKey: string): boolean {
  return !OBJECT_TYPES_WITHOUT_DETAILS_TAB.has(objectTypeKey);
}

/**
 * Primary tabs exposed as `/object/:id/<segment>` (proxy rewrites to `?tab=` internally).
 * Gallery and experts were previously `?tab=` only; all listed segments use clean paths.
 */
export const OBJECT_PAGE_PATH_TAB_SEGMENTS = [
  'list',
  'widget',
  'reviews',
  'updates',
  'followers',
  'ownership',
  OBJECT_PAGE_DESCRIPTION_SEGMENT,
  'gallery',
  'experts',
  'related',
  'similar',
  'add-on',
] as const;

export type ObjectPagePathTabSegment = (typeof OBJECT_PAGE_PATH_TAB_SEGMENTS)[number];

/** Internal query param when proxy rewrites `/object/:id/gallery/album/:name`. */
export const OBJECT_PAGE_GALLERY_ALBUM_PARAM = 'gallery_album';

/** Internal query param when proxy rewrites `/object/:id/books`, `/products`, `/service-offers`, or `/service-requests`. */
export const OBJECT_PAGE_FIELD_REFERENCE_TYPE_PARAM = 'field_reference_type';

/** Internal `?tab=` value for field-reference center feeds. */
export const OBJECT_PAGE_FIELD_REFERENCES_PATH_SEGMENT = 'field-references';

/** Path segment before encoded department category name. */
export const OBJECT_PAGE_CATEGORY_PATH_SEGMENT = 'category';

/** Internal query param when proxy rewrites `/object/:id/category/:name`. */
export const OBJECT_PAGE_CATEGORY_NAME_PARAM = 'category_name';

/** Path segment between `/gallery/` and album name. */
export const OBJECT_PAGE_GALLERY_ALBUM_PATH_SEGMENT = 'album';

/** Internal query param when proxy rewrites `/object/:id/updates/:updateId`. */
export const OBJECT_PAGE_UPDATE_ID_PARAM = 'object_update_id';

export function buildObjectUpdatesPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}/updates`;
}

export function buildObjectUpdatePath(objectId: string, updateId: string): string {
  return `/object/${encodeURIComponent(objectId)}/updates/${encodeURIComponent(updateId)}`;
}

export function buildObjectGalleryAlbumPath(
  objectId: string,
  albumName: string,
): string {
  return `/object/${encodeURIComponent(objectId)}/gallery/${OBJECT_PAGE_GALLERY_ALBUM_PATH_SEGMENT}/${encodeURIComponent(albumName)}`;
}

export function buildObjectGalleryPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}/gallery`;
}

export function buildObjectWidgetPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}/widget`;
}

export function buildObjectListPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}/list`;
}

export function buildObjectRelatedPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}/related`;
}

export function buildObjectSimilarPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}/similar`;
}

export function buildObjectAddOnPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}/add-on`;
}

export function buildObjectCategoryPath(objectId: string, categoryName: string): string {
  return `/object/${encodeURIComponent(objectId)}/${OBJECT_PAGE_CATEGORY_PATH_SEGMENT}/${encodeURIComponent(categoryName)}`;
}

function normalizeObjectPagePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function objectIdMatchesPathSegment(objectId: string, path: string, base: string): boolean {
  if (!path.startsWith(`${base}/`)) {
    return false;
  }
  const pathObjectId = path.slice('/object/'.length).split('/')[0];
  if (!pathObjectId) {
    return false;
  }
  let decodedObjectId = pathObjectId;
  try {
    decodedObjectId = decodeURIComponent(pathObjectId);
  } catch {
    // keep raw segment
  }
  return decodedObjectId === objectId || pathObjectId === objectId;
}

/** Parses the active department category name from `/object/:id/category/:name`. */
export function resolveCategoryNameFromObjectUrl(
  objectId: string,
  pathname: string,
): string | null {
  const path = normalizeObjectPagePathname(pathname);
  const match = path.match(
    new RegExp(`^/object/([^/]+)/${OBJECT_PAGE_CATEGORY_PATH_SEGMENT}/(.+)$`),
  );
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const pathObjectId = match[1];
  let decodedObjectId = pathObjectId;
  try {
    decodedObjectId = decodeURIComponent(pathObjectId);
  } catch {
    // keep raw segment
  }
  if (decodedObjectId !== objectId && pathObjectId !== objectId) {
    return null;
  }
  try {
    return decodeURIComponent(match[2]);
  } catch {
    return match[2];
  }
}

/** Resolves active category from pathname (preferred) or proxy `?category_name=`. */
export function resolveCategoryNameForObjectPage(
  objectId: string,
  pathname: string,
  searchParams: URLSearchParams,
): string | null {
  const fromPath = resolveCategoryNameFromObjectUrl(objectId, pathname);
  if (fromPath !== null) {
    return fromPath;
  }
  const fromQuery = searchParams.get(OBJECT_PAGE_CATEGORY_NAME_PARAM)?.trim();
  if (!fromQuery) {
    return null;
  }
  try {
    return decodeURIComponent(fromQuery);
  } catch {
    return fromQuery;
  }
}

/** Parses field-reference target type from `/object/:id/books`, `/products`, `/service-offers`, or `/service-requests`. */
export function resolveFieldReferenceTypeFromObjectUrl(
  objectId: string,
  pathname: string,
): string | null {
  const path = normalizeObjectPagePathname(pathname);
  const base = `/object/${encodeURIComponent(objectId)}`;

  for (const segment of FIELD_REFERENCE_PATH_SEGMENTS) {
    if (path === `${base}/${segment}` && objectIdMatchesPathSegment(objectId, path, base)) {
      return resolveFieldReferenceTypeFromPathSegment(segment);
    }
  }

  return null;
}

/** Resolves field-reference target type from pathname or proxy query param. */
export function resolveFieldReferenceTypeForObjectPage(
  objectId: string,
  pathname: string,
  searchParams: URLSearchParams,
): string | null {
  const fromPath = resolveFieldReferenceTypeFromObjectUrl(objectId, pathname);
  if (fromPath !== null) {
    return fromPath;
  }
  const fromQuery = searchParams.get(OBJECT_PAGE_FIELD_REFERENCE_TYPE_PARAM)?.trim();
  if (!fromQuery) {
    return null;
  }
  try {
    return decodeURIComponent(fromQuery);
  } catch {
    return fromQuery;
  }
}

export function buildObjectFieldReferencesPath(
  objectId: string,
  referenceObjectType: string,
): string {
  const segment = resolveFieldReferencePathSegmentFromType(referenceObjectType);
  if (segment == null) {
    return `/object/${encodeURIComponent(objectId)}/${encodeURIComponent(referenceObjectType)}`;
  }
  return `/object/${encodeURIComponent(objectId)}/${segment}`;
}

export function isFieldReferenceFeedPathSegment(segment: string): boolean {
  return isFieldReferencePathSegment(segment);
}

/** Internal query param when proxy rewrites `/object/:id/reviews/:feedSub`. */
export const OBJECT_PAGE_REVIEWS_SUB_PARAM = 'reviews_sub';

/** Path segments under `/object/:id/reviews/…` (Posts, Threads, Activity). */
export const REVIEWS_FEED_PATH_SEGMENTS = ['posts', 'threads', 'activity'] as const;

/** Legacy Reviews sub-tab segment; maps to {@link ReviewsFeedSubType} `activity`. */
export const LEGACY_REVIEWS_MESSAGES_SEGMENT = 'messages' as const;

export function buildObjectFollowersPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}/followers`;
}

/** @deprecated Prefer {@link buildObjectReviewsSubPath} with `activity`. */
export function buildObjectMessagesPath(objectId: string): string {
  return buildObjectReviewsSubPath(objectId, 'activity');
}

export function buildObjectReviewsSubPath(
  objectId: string,
  sub: (typeof REVIEWS_FEED_PATH_SEGMENTS)[number],
): string {
  const base = `/object/${encodeURIComponent(objectId)}/reviews`;
  return sub === 'posts' ? base : `${base}/${sub}`;
}

export function buildObjectExpertsPath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}/experts`;
}
