/**
 * @jest-environment jsdom
 */
import {
  clearDiscoverFeedCacheForTests,
  discoverFeedCacheKey,
  readDiscoverFeedCache,
  writeDiscoverFeedCache,
} from './discover-feed-cache';

const page = (id: string) => ({
  items: [{ object_id: id } as never],
  cursor: null,
  hasMore: false,
});

describe('discover-feed-cache', () => {
  beforeEach(() => {
    clearDiscoverFeedCacheForTests();
  });

  it('keeps the three most recent queries', () => {
    const base = { q: '', tags: [] as string[], sort: 'rank' as const, box: null };
    writeDiscoverFeedCache(discoverFeedCacheKey({ ...base, objectType: 'a' }), page('a'));
    writeDiscoverFeedCache(discoverFeedCacheKey({ ...base, objectType: 'b' }), page('b'));
    writeDiscoverFeedCache(discoverFeedCacheKey({ ...base, objectType: 'c' }), page('c'));
    writeDiscoverFeedCache(discoverFeedCacheKey({ ...base, objectType: 'd' }), page('d'));

    expect(readDiscoverFeedCache(discoverFeedCacheKey({ ...base, objectType: 'a' }))).toBeNull();
    expect(readDiscoverFeedCache(discoverFeedCacheKey({ ...base, objectType: 'd' }))?.items[0]).toMatchObject({
      object_id: 'd',
    });
  });
});