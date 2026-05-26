jest.mock('server-only', () => ({}));

jest.mock('@/modules/user-profile/infrastructure/clients/query-api.client', () => ({
  queryApiFetch: jest.fn(),
}));

import {
  fetchDiscoverObjectsForSitemap,
  fetchDiscoverUsersForSitemap,
} from './sitemap-data';

const { queryApiFetch } = jest.requireMock(
  '@/modules/user-profile/infrastructure/clients/query-api.client',
) as { queryApiFetch: jest.Mock };

describe('sitemap-data', () => {
  beforeEach(() => {
    queryApiFetch.mockReset();
  });

  it('paginates discover objects until limit', async () => {
    queryApiFetch
      .mockResolvedValueOnce({
        items: [{ object_id: 'a' }, { object_id: 'b' }],
        cursor: 'c1',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [{ object_id: 'c' }],
        cursor: null,
        hasMore: false,
      });

    const rows = await fetchDiscoverObjectsForSitemap({ limit: 3 });
    expect(rows).toEqual([
      { object_id: 'a' },
      { object_id: 'b' },
      { object_id: 'c' },
    ]);
    expect(queryApiFetch).toHaveBeenCalledTimes(2);
  });

  it('returns empty array on fetch failure', async () => {
    queryApiFetch.mockResolvedValue(null);
    await expect(fetchDiscoverUsersForSitemap({ limit: 10 })).resolves.toEqual([]);
  });
});
