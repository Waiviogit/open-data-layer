import {
  AUTHORITY_SUB_VALUES,
  type AuthoritySubType,
} from '@/modules/object/domain/object-page.types';
import {
  OBJECT_PAGE_DESCRIPTION_SEGMENT,
  OBJECT_PAGE_GALLERY_ALBUM_PARAM,
  OBJECT_PAGE_GALLERY_ALBUM_PATH_SEGMENT,
  OBJECT_PAGE_PATH_TAB_SEGMENTS,
  OBJECT_PAGE_VIEW_PATH_PARAM,
} from '@/modules/object/domain/object-page-url.constants';
import { parseViewPathFromSearchParam } from '@/modules/object/domain/object-page-path';
import type { ObjectNestedViewResolved } from '@/modules/object/domain/object-page.types';

/** Search param for the object profile primary tab (Reviews, Updates, …). */
export const OBJECT_PAGE_PRIMARY_TAB_PARAM = 'tab';

/** Administrative vs ownership lists under the Authority tab. */
export const OBJECT_PAGE_AUTHORITY_SUB_PARAM = 'sub';

export {
  OBJECT_PAGE_DESCRIPTION_SEGMENT,
  OBJECT_PAGE_GALLERY_ALBUM_PARAM,
  OBJECT_PAGE_VIEW_PATH_PARAM,
};

export type { AuthoritySubType };

export function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) {
    return v[0];
  }
  return v;
}

export function parseAuthoritySubTypeParam(
  sp: Record<string, string | string[] | undefined>,
): AuthoritySubType {
  const v = firstSearchParam(sp, OBJECT_PAGE_AUTHORITY_SUB_PARAM)?.trim();
  if (v && AUTHORITY_SUB_VALUES.includes(v as AuthoritySubType)) {
    return v as AuthoritySubType;
  }
  return 'administrative';
}

/** Ordered object ids from `?path=id1,id2` (empty when absent or invalid). */
export function parseViewPathParam(
  sp: Record<string, string | string[] | undefined>,
): string[] {
  return parseViewPathFromSearchParam(firstSearchParam(sp, OBJECT_PAGE_VIEW_PATH_PARAM));
}

/**
 * Keeps SSR nested stack aligned with requested path ids.
 * Returns an empty stack when the path could not be resolved (avoids client crash / stale URL).
 */
export function sanitizeNestedStack(
  pathIds: string[],
  stack: ObjectNestedViewResolved[],
): ObjectNestedViewResolved[] {
  if (pathIds.length === 0) {
    return stack;
  }
  if (stack.length === 0) {
    return [];
  }
  const matchesPrefix = stack.every((entry, index) => entry.objectId === pathIds[index]);
  if (!matchesPrefix) {
    return [];
  }
  return stack;
}

const PATH_TAB_SEGMENTS = OBJECT_PAGE_PATH_TAB_SEGMENTS;

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Resolves the active primary tab from the visible URL (pathname + optional `?tab=`).
 * Empty string = menu landing (`/object/:id` with no tab segment).
 */
export function resolvePrimarySegmentFromObjectUrl(
  objectId: string,
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const base = `/object/${encodeURIComponent(objectId)}`;
  const path = normalizePathname(pathname);
  const galleryAlbumPrefix = `${base}/gallery/${OBJECT_PAGE_GALLERY_ALBUM_PATH_SEGMENT}/`;
  if (path === `${base}/gallery` || path.startsWith(galleryAlbumPrefix)) {
    return 'gallery';
  }
  for (const segment of PATH_TAB_SEGMENTS) {
    if (path === `${base}/${segment}`) {
      return segment;
    }
  }
  const tab = searchParams.get(OBJECT_PAGE_PRIMARY_TAB_PARAM)?.trim();
  return tab ?? '';
}

/**
 * Parses the active gallery album name from a visible object URL pathname.
 * Returns `null` on the albums list (`/object/:id/gallery`) or when absent.
 */
export function resolveGalleryAlbumFromObjectUrl(
  objectId: string,
  pathname: string,
): string | null {
  const base = `/object/${encodeURIComponent(objectId)}`;
  const path = normalizePathname(pathname);
  const prefix = `${base}/gallery/${OBJECT_PAGE_GALLERY_ALBUM_PATH_SEGMENT}/`;
  if (!path.startsWith(prefix)) {
    return null;
  }
  const encoded = path.slice(prefix.length);
  if (!encoded) {
    return null;
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

/** Resolves active gallery album from pathname (preferred) or proxy `?gallery_album=`. */
export function resolveGalleryAlbumForObjectPage(
  objectId: string,
  pathname: string,
  searchParams: URLSearchParams,
): string | null {
  const fromPath = resolveGalleryAlbumFromObjectUrl(objectId, pathname);
  if (fromPath !== null) {
    return fromPath;
  }
  const fromQuery = searchParams.get(OBJECT_PAGE_GALLERY_ALBUM_PARAM)?.trim();
  if (!fromQuery) {
    return null;
  }
  try {
    return decodeURIComponent(fromQuery);
  } catch {
    return fromQuery;
  }
}

/**
 * Resolves active primary tab from URL, falling back to SSR default landing when the URL is
 * clean (`/object/:id` with no `?tab=` or path segment) so default `reviews` can show without
 * `/reviews` in the path.
 */
export function resolvePrimarySegmentForObjectPage(
  objectId: string,
  pathname: string,
  searchParams: URLSearchParams,
  defaultSegmentWhenClean: string,
): string {
  const fromUrl = resolvePrimarySegmentFromObjectUrl(objectId, pathname, searchParams);
  if (fromUrl !== '') {
    return fromUrl;
  }
  if (searchParams.has(OBJECT_PAGE_VIEW_PATH_PARAM)) {
    return '';
  }
  return defaultSegmentWhenClean;
}
