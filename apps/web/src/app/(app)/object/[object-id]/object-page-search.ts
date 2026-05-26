import {
  AUTHORITY_SUB_VALUES,
  type AuthoritySubType,
} from '@/modules/object/domain/object-page.types';
import { OBJECT_PAGE_VIEW_PATH_PARAM } from '@/modules/object/domain/object-page-url.constants';
import { parseViewPathFromSearchParam } from '@/modules/object/domain/object-page-path';

/** Search param for the object profile primary tab (Reviews, Updates, …). */
export const OBJECT_PAGE_PRIMARY_TAB_PARAM = 'tab';

/** Administrative vs ownership lists under the Authority tab. */
export const OBJECT_PAGE_AUTHORITY_SUB_PARAM = 'sub';

export { OBJECT_PAGE_VIEW_PATH_PARAM };

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

const PATH_TAB_SEGMENTS = ['reviews', 'updates', 'followers', 'authority'] as const;

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
  for (const segment of PATH_TAB_SEGMENTS) {
    if (path === `${base}/${segment}`) {
      return segment;
    }
  }
  const tab = searchParams.get(OBJECT_PAGE_PRIMARY_TAB_PARAM)?.trim();
  return tab ?? '';
}
