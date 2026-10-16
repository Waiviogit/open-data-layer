/**
 * @jest-environment node
 */
import { updateTag } from 'next/cache';

import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

import { refreshMessagesUnreadCountAction } from './feed-unread.actions';
import { fetchUserFeedUnreadCountsLive } from './clients/feed-unread.client';

jest.mock('next/cache', () => ({
  updateTag: jest.fn(),
}));

jest.mock('@/shared/infrastructure/auth/cookie-auth-context-provider', () => ({
  createCookieAuthContextProvider: () => ({
    getUser: async () => ({ username: 'alice' }),
  }),
}));

jest.mock('./clients/feed-unread.client', () => ({
  fetchUserFeedUnreadCountsLive: jest.fn(),
  markUserProfileFeedRead: jest.fn(),
}));

describe('refreshMessagesUnreadCountAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates unread + channel list tags and returns the live messages count', async () => {
    (fetchUserFeedUnreadCountsLive as jest.Mock).mockResolvedValue({
      posts: 0,
      threads: 0,
      messages: 5,
    });

    await expect(refreshMessagesUnreadCountAction()).resolves.toBe(5);
    expect(updateTag).toHaveBeenCalledWith(queryApiCacheTags.userFeedUnreadCounts('alice'));
    expect(updateTag).toHaveBeenCalledWith(queryApiCacheTags.viewerChannels('alice'));
    expect(fetchUserFeedUnreadCountsLive).toHaveBeenCalledWith('alice', 'alice');
  });
});
