import type { SearchObjectResult, SearchResponse, SearchUserResult } from './search-response.schema';

/** Tab key: a specific `object_type` or users-only. */
export type SearchFilterTab = 'users' | string;

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
  } else {
    sp.set('type', tab);
  }
  const qs = sp.toString();
  return qs.length > 0 ? `/discover?${qs}` : '/discover';
}

export type SearchFlatEntry =
  | { kind: 'object'; item: SearchObjectResult }
  | { kind: 'user'; item: SearchUserResult };

/**
 * Linear order for keyboard nav and Enter: objects first (maybe filtered), then users (maybe filtered).
 */
export function buildSearchFlatList(
  results: SearchResponse,
  tab: SearchFilterTab,
): SearchFlatEntry[] {
  if (tab === 'users') {
    return results.users.map((item) => ({ kind: 'user' as const, item }));
  }
  return results.objects
    .filter((o) => o.object_type === tab)
    .map((item) => ({ kind: 'object' as const, item }));
}

export function formatObjectTypeLabel(objectType: string): string {
  if (!objectType) {
    return objectType;
  }
  return objectType.charAt(0).toUpperCase() + objectType.slice(1);
}
