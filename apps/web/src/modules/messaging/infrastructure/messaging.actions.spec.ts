/**
 * @jest-environment node
 */
import { updateTag } from 'next/cache';

import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

import { markChannelReadAction } from './messaging.actions';
import { markChannelRead } from './messaging.client';

jest.mock('next/cache', () => ({
  updateTag: jest.fn(),
}));

jest.mock('@/shared/infrastructure/auth/cookie-auth-context-provider', () => ({
  createCookieAuthContextProvider: () => ({
    getUser: async () => ({ username: 'alice' }),
  }),
}));

jest.mock('./messaging.client', () => ({
  markChannelRead: jest.fn(),
}));

jest.mock('../application/queries/get-channel-by-id.query', () => ({
  getChannelByIdQuery: jest.fn(),
}));

jest.mock('../application/queries/get-channel-messages.query', () => ({
  getChannelMessagesQuery: jest.fn(),
}));

jest.mock('../application/queries/get-object-channel-messages.query', () => ({
  getObjectChannelMessagesQuery: jest.fn(),
}));

jest.mock('../application/queries/get-viewer-channels.query', () => ({
  getViewerChannelsQuery: jest.fn(),
}));

describe('markChannelReadAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks the channel read and invalidates list + header unread tags', async () => {
    (markChannelRead as jest.Mock).mockResolvedValue({
      updated: true,
      last_read_at_unix: 1_700_000_000,
    });

    await expect(markChannelReadAction('dm-1', 1_700_000_000)).resolves.toBe(true);

    expect(markChannelRead).toHaveBeenCalledWith('dm-1', 'alice', 1_700_000_000);
    expect(updateTag).toHaveBeenCalledWith(queryApiCacheTags.viewerChannels('alice'));
    expect(updateTag).toHaveBeenCalledWith(queryApiCacheTags.userFeedUnreadCounts('alice'));
  });

  it('does not invalidate tags when the API returns null', async () => {
    (markChannelRead as jest.Mock).mockResolvedValue(null);

    await expect(markChannelReadAction('dm-1', 1_700_000_000)).resolves.toBe(false);
    expect(updateTag).not.toHaveBeenCalled();
  });
});
