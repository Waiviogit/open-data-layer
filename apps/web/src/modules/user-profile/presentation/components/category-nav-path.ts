/** Single URL segment for "objects with no category"; reserved path (not a department name). */
export const UNCATEGORIZED_SHOP_PATH_SEGMENT = 'uncategorized';

/** Decode one URL path segment (pathname or dynamic param). */
export function decodeCategoryPathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Category path segments after `user-shop` or `recipe` (decoded), for both `/@account/…` and `/user-profile/account/…`.
 */
export function getCategoryLineageFromPathname(
  pathname: string,
  sectionKey: 'user-shop' | 'recipe',
): string[] {
  let parts: string[];
  if (pathname.startsWith('/@')) {
    parts = pathname.slice(2).split('/').filter(Boolean);
  } else if (pathname.startsWith('/user-profile/')) {
    parts = pathname.slice('/user-profile/'.length).split('/').filter(Boolean);
  } else {
    return [];
  }

  if (parts.length < 2) {
    return [];
  }

  const tail = parts.slice(1);
  const idx = tail.indexOf(sectionKey);
  if (idx < 0) {
    return [];
  }

  return tail.slice(idx + 1).map(decodeCategoryPathSegment);
}

/** Maps full URL lineage to query-api `name` + `path` (parent node for the listing). */
export function apiNavContextFromLineage(lineage: string[]): {
  parentName?: string;
  path: string[];
} {
  if (lineage.length === 0) {
    return { parentName: undefined, path: [] };
  }
  return {
    parentName: lineage[lineage.length - 1],
    path: lineage.slice(0, -1),
  };
}
