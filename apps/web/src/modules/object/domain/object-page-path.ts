import { OBJECT_PAGE_VIEW_PATH_PARAM } from './object-page-url.constants';

/** Ordered object ids from `?path=id1,id2` (empty when absent or invalid). */
export function parseViewPathFromSearchParam(raw: string | null | undefined): string[] {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return [];
  }
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function parseViewPathFromUrlSearchParams(sp: URLSearchParams): string[] {
  return parseViewPathFromSearchParam(sp.get(OBJECT_PAGE_VIEW_PATH_PARAM));
}

export function viewPathSearchParamValue(pathIds: string[]): string | null {
  if (pathIds.length === 0) {
    return null;
  }
  return pathIds.join(',');
}
