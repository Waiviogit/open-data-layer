import type { SearchObjectResult, SearchResponse, SearchUserResult } from './search-response.schema';

/** Tab key: all object hits, a specific `object_type`, or users-only. */
export type SearchFilterTab = 'all' | 'users' | string;

export const HEADER_SEARCH_ALL_TAB = 'all' as const satisfies SearchFilterTab;

/** Pick default tab when counts load: highest object_type count, else users if only users, else first type key. */
export function pickDefaultSearchFilterTab(
  typeCounts: Record<string, number>,
  totalUsers: number,
): SearchFilterTab {
  const entries = Object.entries(typeCounts).filter(([, n]) => n > 0);
  if (entries.length === 0) {
    return totalUsers > 0 ? 'users' : Object.keys(typeCounts).sort()[0] ?? 'users';
  }
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0][0];
}

/** Keep the active tab when possible after `/search` results arrive. */
export function pickSearchFilterTabFromResults(
  results: SearchResponse,
  prev: SearchFilterTab,
): SearchFilterTab {
  if (prev === 'users' && results.users.length > 0) {
    return 'users';
  }
  if (results.objects.length > 0) {
    return HEADER_SEARCH_ALL_TAB;
  }
  if (results.users.length > 0) {
    return 'users';
  }
  return HEADER_SEARCH_ALL_TAB;
}

/** Keep the active tab when possible after `/search/counts` arrives. */
export function reconcileSearchFilterTabFromCounts(
  prev: SearchFilterTab,
  typeCounts: Record<string, number>,
  totalUsers: number,
  results?: SearchResponse | null,
): SearchFilterTab {
  if (prev === 'users' && totalUsers > 0) {
    return 'users';
  }
  const objectCount = Object.values(typeCounts).reduce((sum, n) => sum + n, 0);
  if (objectCount > 0 || (results?.objects.length ?? 0) > 0) {
    return HEADER_SEARCH_ALL_TAB;
  }
  if (totalUsers > 0) {
    return 'users';
  }
  return HEADER_SEARCH_ALL_TAB;
}

export function buildDiscoverHrefFromSearch(
  tab: SearchFilterTab,
  query: string,
): string {
  const q = query.trim();
  const sp = new URLSearchParams();
  if (q) {
    sp.set('q', q);
  }
  if (tab === 'users') {
    sp.set('users', '1');
  } else if (tab !== HEADER_SEARCH_ALL_TAB) {
    sp.set('type', tab);
  }
  const qs = sp.toString();
  return qs.length > 0 ? `/discover?${qs}` : '/discover';
}

export type SearchFlatEntry =
  | { kind: 'object'; item: SearchObjectResult }
  | { kind: 'user'; item: SearchUserResult };

/**
 * Linear order for keyboard nav: all objects then users (users tab is users-only).
 */
export function buildSearchFlatList(
  results: SearchResponse,
  tab: SearchFilterTab,
): SearchFlatEntry[] {
  if (tab === 'users') {
    return results.users.map((item) => ({ kind: 'user' as const, item }));
  }
  const objects = results.objects.map((item) => ({ kind: 'object' as const, item }));
  const users = results.users.map((item) => ({ kind: 'user' as const, item }));
  return [...objects, ...users];
}

export function formatObjectTypeLabel(objectType: string): string {
  if (!objectType) {
    return objectType;
  }
  return objectType.charAt(0).toUpperCase() + objectType.slice(1);
}
