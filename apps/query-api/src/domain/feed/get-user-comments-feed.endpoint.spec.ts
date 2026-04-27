import { HiveClient } from '@opden-data-layer/clients';
import type { HiveContentType } from '@opden-data-layer/clients';
import type { AccountCurrent } from '@opden-data-layer/core';
import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import { GetUserCommentsFeedEndpoint } from './get-user-comments-feed.endpoint';

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

describe('GetUserCommentsFeedEndpoint', () => {
  let accounts: jest.Mocked<Pick<AccountsCurrentRepository, 'findByName'>>;
  let hiveClient: jest.Mocked<Pick<HiveClient, 'getDiscussionsByComments'>>;
  let endpoint: GetUserCommentsFeedEndpoint;

  beforeEach(() => {
    accounts = {
      findByName: jest.fn(),
    };
    hiveClient = {
      getDiscussionsByComments: jest.fn().mockResolvedValue([]),
    };
    endpoint = new GetUserCommentsFeedEndpoint(
      accounts as unknown as AccountsCurrentRepository,
      hiveClient as unknown as HiveClient,
    );
  });

  it('returns null when account is missing', async () => {
    accounts.findByName.mockResolvedValue(null);
    const r = await endpoint.execute('alice', { limit: 20, sort: 'latest' }, undefined);
    expect(r).toBeNull();
    expect(hiveClient.getDiscussionsByComments).not.toHaveBeenCalled();
  });

  it('maps Hive rows to feed items', async () => {
    accounts.findByName.mockResolvedValue(minimalAccount('alice'));
    const c1 = {
      author: 'alice',
      permlink: 're-alice-1',
      title: '',
      body: '<p>c1</p>',
      json_metadata: '{}',
      category: 'blog',
      created: '2024-01-15T10:00:00',
      children: 0,
      pending_payout_value: '0',
      total_payout_value: '0',
      net_rshares: 1,
      parent_author: 'bob',
      parent_permlink: 'root',
      url: '/blog/@bob/root#@alice/re-alice-1',
      reblogged_users: [],
      active_votes: [],
    } as unknown as HiveContentType;
    const c2 = {
      author: 'alice',
      permlink: 're-alice-2',
      title: '',
      body: '<p>c2</p>',
      json_metadata: '{}',
      category: 'blog',
      created: '2024-01-16T10:00:00',
      children: 0,
      pending_payout_value: '0',
      total_payout_value: '0',
      net_rshares: 2,
      parent_author: 'bob',
      parent_permlink: 'root2',
      url: '/blog/@bob/root2#@alice/re-alice-2',
      reblogged_users: [],
      active_votes: [],
    } as unknown as HiveContentType;

    hiveClient.getDiscussionsByComments.mockResolvedValue([c1, c2]);

    const r = await endpoint.execute('alice', { limit: 1, sort: 'latest' }, undefined);
    expect(r).not.toBeNull();
    if (r == null) {
      throw new Error('expected result');
    }
    expect(r.items).toHaveLength(1);
    expect(r.items[0].permlink).toBe('re-alice-1');
    expect(r.hasMore).toBe(true);
    expect(r.cursor).not.toBeNull();
    expect(hiveClient.getDiscussionsByComments).toHaveBeenCalledWith({
      start_author: 'alice',
      limit: 15,
    });
  });

  it('excludes Leo Threads and fetches further Hive pages until non-Leo comments fill the page', async () => {
    accounts.findByName.mockResolvedValue(minimalAccount('alice'));
    const leo1 = {
      author: 'alice',
      permlink: 'leo-a',
      title: '',
      body: '<p>leo</p>',
      json_metadata: '{}',
      category: 'blog',
      created: '2024-01-15T10:00:00',
      children: 0,
      pending_payout_value: '0',
      total_payout_value: '0',
      net_rshares: 0,
      parent_author: 'leothreads',
      parent_permlink: 'x',
      url: '/hive-1/@leothreads/x',
      reblogged_users: [],
      active_votes: [],
    } as unknown as HiveContentType;
    const leo2 = {
      author: 'alice',
      permlink: 'leo-b',
      title: '',
      body: '<p>leo2</p>',
      json_metadata: '{}',
      category: 'blog',
      created: '2024-01-15T11:00:00',
      children: 0,
      pending_payout_value: '0',
      total_payout_value: '0',
      net_rshares: 0,
      parent_author: 'leothreads',
      parent_permlink: 'y',
      url: '/hive-1/@leothreads/y',
      reblogged_users: [],
      active_votes: [],
    } as unknown as HiveContentType;
    const ok = {
      author: 'alice',
      permlink: 'ok',
      title: '',
      body: '<p>ok</p>',
      json_metadata: '{}',
      category: 'blog',
      created: '2024-01-16T10:00:00',
      children: 0,
      pending_payout_value: '0',
      total_payout_value: '0',
      net_rshares: 0,
      parent_author: 'bob',
      parent_permlink: 'r',
      url: '/blog/@bob/r',
      reblogged_users: [],
      active_votes: [],
    } as unknown as HiveContentType;

    let call = 0;
    hiveClient.getDiscussionsByComments.mockImplementation(async (args) => {
      call += 1;
      if (call === 1) {
        expect(args).toMatchObject({
          start_author: 'alice',
          limit: 20,
        });
        expect(args.start_permlink).toBeUndefined();
        return [leo1, leo2];
      }
      if (call === 2) {
        expect(args).toMatchObject({
          start_author: 'alice',
          start_permlink: 'leo-b',
          limit: 20,
        });
        return [ok];
      }
      if (call === 3) {
        expect(args.start_permlink).toBe(ok.permlink);
        return [];
      }
      return [];
    });

    const r = await endpoint.execute('alice', { limit: 20, sort: 'latest' }, undefined);
    expect(call).toBe(3);
    expect(r?.items).toHaveLength(1);
    expect(r?.items[0].permlink).toBe('ok');
  });

  it('returns empty items when Hive only returns Leo Threads (then exhausts)', async () => {
    accounts.findByName.mockResolvedValue(minimalAccount('alice'));
    const leo = {
      author: 'alice',
      permlink: 'only-leo',
      title: '',
      body: '',
      json_metadata: '{}',
      category: 'blog',
      created: '2024-01-15T10:00:00',
      children: 0,
      pending_payout_value: '0',
      total_payout_value: '0',
      net_rshares: 0,
      parent_author: 'leothreads',
      parent_permlink: 'x',
      url: '/@leothreads/x',
      reblogged_users: [],
      active_votes: [],
    } as unknown as HiveContentType;

    let call = 0;
    hiveClient.getDiscussionsByComments.mockImplementation(async () => {
      call += 1;
      if (call <= 2) {
        return [leo];
      }
      return [];
    });

    const r = await endpoint.execute('alice', { limit: 5, sort: 'latest' }, undefined);
    expect(r?.items).toHaveLength(0);
    expect(r?.hasMore).toBe(false);
    expect(call).toBeGreaterThanOrEqual(3);
  });
});
