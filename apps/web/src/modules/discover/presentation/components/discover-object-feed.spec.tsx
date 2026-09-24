/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import {
  beginScrollRestore,
  resetScrollRestoreForTests,
} from '@/shared/presentation/navigation/scroll-memory';

import {
  clearDiscoverFeedCacheForTests,
  discoverFeedCacheKey,
  writeDiscoverFeedCache,
} from '../../infrastructure/discover-feed-cache';
import { fetchDiscoverObjects } from '../../infrastructure/discover.client';
import { DiscoverObjectFeed } from './discover-object-feed';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock('@/shared/presentation', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

jest.mock('@/shared/presentation/layout', () => ({
  FeedColumn: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/modules/feed/presentation/components/object-card', () => ({
  ObjectCard: ({ object }: { object: { name?: string } }) => <div>{object.name}</div>,
}));

jest.mock('../../infrastructure/discover.client', () => ({
  fetchDiscoverObjects: jest.fn(),
}));

const fetchMock = fetchDiscoverObjects as jest.MockedFunction<typeof fetchDiscoverObjects>;

const query = {
  objectType: 'product',
  q: '',
  tags: [] as string[],
  sort: 'rank' as const,
  box: null,
};

describe('DiscoverObjectFeed scroll restore', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ items: [], cursor: null, hasMore: false });
    clearDiscoverFeedCacheForTests();
    resetScrollRestoreForTests();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  });

  afterEach(() => {
    resetScrollRestoreForTests();
    jest.restoreAllMocks();
  });

  it('seeds the list from cache and skips the refetch while a restore is pending', () => {
    writeDiscoverFeedCache(discoverFeedCacheKey(query), {
      items: [{ object_id: 'knife', name: 'Leatherman' } as never],
      cursor: 'page-2',
      hasMore: true,
    });
    beginScrollRestore(1800);

    render(<DiscoverObjectFeed {...query} />);

    expect(screen.getByText('Leatherman')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});