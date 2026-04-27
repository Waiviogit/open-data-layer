import type { AccountCurrent } from '@opden-data-layer/core';
import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import { PostsRepository, type FeedBranchRow } from '../../repositories/posts.repository';
import { UserAccountMutesRepository } from '../../repositories/user-account-mutes.repository';
import { GetUserMentionsFeedEndpoint } from './get-user-mentions-feed.endpoint';
import type { FeedStoryItemDto } from './feed-story-dtos';

jest.mock('./build-feed-story-items-from-post-page', () => ({
  buildFeedStoryItemsFromPostPage: jest.fn(),
}));

import { buildFeedStoryItemsFromPostPage } from './build-feed-story-items-from-post-page';

const mockBuild = buildFeedStoryItemsFromPostPage as jest.MockedFunction<
  typeof buildFeedStoryItemsFromPostPage
>;

function minimalAccount(name: string): AccountCurrent {
  return {
    name,
    alias: null,
    posting_json_metadata: '{}',
    profile_image: null,
    followers_count: 0,
    users_following_count: 0,
    post_count: 0,
    object_reputation: 25,
  } as AccountCurrent;
}

describe('GetUserMentionsFeedEndpoint', () => {
  let accounts: jest.Mocked<Pick<AccountsCurrentRepository, 'findByName'>>;
  let postsRepo: jest.Mocked<
    Pick<PostsRepository, 'findMentionsFeed' | 'findPostsByKeys'>
  >;
  let mutesRepo: jest.Mocked<Pick<UserAccountMutesRepository, 'listMutedForMuters'>>;
  let endpoint: GetUserMentionsFeedEndpoint;

  const noopAggregated = {} as never;
  const noopObjectView = {} as never;
  const noopGovernance = {} as never;
  const noopProjection = {} as never;

  beforeEach(() => {
    accounts = { findByName: jest.fn() };
    postsRepo = {
      findMentionsFeed: jest.fn(),
      findPostsByKeys: jest.fn(),
    };
    mutesRepo = { listMutedForMuters: jest.fn() };
    mockBuild.mockResolvedValue([
      {
        id: 'bob/p1',
        author: 'bob',
        permlink: 'p1',
        title: '',
        excerpt: '',
        createdAt: new Date(0).toISOString(),
        feedAt: new Date(0).toISOString(),
        rebloggedBy: null,
        isNsfw: false,
        category: null,
        children: 0,
        pendingPayout: '',
        totalPayout: '',
        netRshares: '0',
        thumbnailUrl: null,
        videoThumbnailUrl: null,
        videoEmbedUrl: null,
        authorProfile: {
          name: 'bob',
          displayName: null,
          avatarUrl: null,
          reputation: 0,
        },
        objects: [],
        votes: { totalCount: 0, previewVoters: [], voted: false },
      } satisfies FeedStoryItemDto,
    ]);

    endpoint = new GetUserMentionsFeedEndpoint(
      postsRepo as unknown as PostsRepository,
      accounts as unknown as AccountsCurrentRepository,
      mutesRepo as unknown as UserAccountMutesRepository,
      noopAggregated,
      noopObjectView,
      noopGovernance,
      noopProjection,
    );
  });

  it('returns null when profile account is missing', async () => {
    accounts.findByName.mockResolvedValue(null);
    const r = await endpoint.execute('alice', { limit: 20 }, 'en', undefined, undefined);
    expect(r).toBeNull();
    expect(postsRepo.findMentionsFeed).not.toHaveBeenCalled();
  });

  it('loads mutes when viewer is set and passes them to findMentionsFeed', async () => {
    accounts.findByName.mockResolvedValue(minimalAccount('alice'));
    mutesRepo.listMutedForMuters.mockResolvedValue(['spammer']);
    const row: FeedBranchRow = {
      author: 'bob',
      permlink: 'p1',
      feed_at: 100,
      reblogged_by: null,
    };
    postsRepo.findMentionsFeed.mockResolvedValue([row]);

    const r = await endpoint.execute('alice', { limit: 20 }, 'en', undefined, 'viewer1');
    expect(r).not.toBeNull();
    expect(mutesRepo.listMutedForMuters).toHaveBeenCalledWith(['viewer1']);
    expect(postsRepo.findMentionsFeed).toHaveBeenCalledWith(
      'alice',
      ['spammer'],
      null,
      21,
    );
    expect(r?.items).toHaveLength(1);
    expect(r?.items[0].author).toBe('bob');
  });

  it('does not call listMutedForMuters when viewer is absent', async () => {
    accounts.findByName.mockResolvedValue(minimalAccount('alice'));
    postsRepo.findMentionsFeed.mockResolvedValue([]);

    await endpoint.execute('alice', { limit: 20 }, 'en', undefined, undefined);
    expect(mutesRepo.listMutedForMuters).not.toHaveBeenCalled();
    expect(postsRepo.findMentionsFeed).toHaveBeenCalledWith('alice', [], null, 21);
  });
});
