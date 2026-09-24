import type { DiscoverObjectsPage } from '../domain/discover-response.schema';
import type { DiscoverBox } from '../domain/discover-url';

const MAX_ENTRIES = 3;

const cache = new Map<string, DiscoverObjectsPage>();

export type DiscoverFeedCacheQuery = {
  objectType: string;
  q: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'rank';
  box: DiscoverBox | null;
};

export function discoverFeedCacheKey(query: DiscoverFeedCacheQuery): string {
  const box = query.box
    ? `${query.box.swLng},${query.box.swLat},${query.box.neLng},${query.box.neLat}`
    : '';
  return [
    query.objectType,
    query.q,
    [...query.tags].sort().join('\u0001'),
    query.sort,
    box,
  ].join('\u0002');
}

export function readDiscoverFeedCache(key: string): DiscoverObjectsPage | null {
  const hit = cache.get(key);
  if (!hit) {
    return null;
  }
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

export function writeDiscoverFeedCache(key: string, page: DiscoverObjectsPage): void {
  cache.delete(key);
  cache.set(key, page);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    cache.delete(oldest);
  }
}

export function clearDiscoverFeedCacheForTests(): void {
  cache.clear();
}
