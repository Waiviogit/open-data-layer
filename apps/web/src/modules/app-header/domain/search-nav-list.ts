import type { SearchObjectResult, SearchResponse, SearchUserResult } from './search-response.schema';

/** Tab key: all results, a specific `object_type`, or users-only. */
export type SearchFilterTab = 'all' | 'users' | string;

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
  if (tab === 'all') {
    return [
      ...results.objects.map((item) => ({ kind: 'object' as const, item })),
      ...results.users.map((item) => ({ kind: 'user' as const, item })),
    ];
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
