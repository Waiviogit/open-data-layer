import { DEFAULT_GOVERNANCE_SNAPSHOT } from '@opden-data-layer/objects-domain';
import { Thread } from '@opden-data-layer/odl-db-types';

import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import { ObjectsCoreRepository } from '../../repositories/objects-core.repository';
import { ThreadsRepository } from '../../repositories/threads.repository';
import { UserAccountMutesRepository } from '../../repositories/user-account-mutes.repository';

import { encodeFeedCursor } from './feed-cursor';
import { GetObjectThreadsFeedEndpoint } from './get-object-threads-feed.endpoint';
import * as threadFeedHydrator from './thread-feed-hydrator';
import type { GovernanceResolverService } from '../governance';

jest.mock('./thread-feed-hydrator', () => ({
  hydrateThreadFeedPage: jest.fn(),
}));

const hydrateThreadFeedPageMock = threadFeedHydrator.hydrateThreadFeedPage as jest.MockedFunction<
  typeof threadFeedHydrator.hydrateThreadFeedPage
>;

function threadRow(author: string, permlink: string, created_unix: number): Thread {
  return {
    author,
    permlink,
    parent_author: '',
    parent_permlink: '',
    body: 'body',
    created: '',
    replies: [],
    children: 0,
    depth: 0,
    author_reputation: BigInt(25),
    deleted: false,
    bulk_message: false,
    type: 'ecencythreads',
    hashtags: ['waivio'],
    mentions: [],
    tickers: [],
    links: [],
    images: [],
    threadstorm: false,
    net_rshares: null,
    pending_payout_value: null,
    total_payout_value: null,
    percent_hbd: null,
    cashout_time: null,
    created_unix,
    updated_at_unix: created_unix,
  };
}

describe('GetObjectThreadsFeedEndpoint', () => {
  let threadsRepo: jest.Mocked<Pick<ThreadsRepository, 'findObjectThreadsFeed'>>;
  let objectsCoreRepo: jest.Mocked<Pick<ObjectsCoreRepository, 'findByObjectIdForPage'>>;
  let accounts: jest.Mocked<Pick<AccountsCurrentRepository, 'findByNames'>>;
  let userAccountMutesRepo: jest.Mocked<Pick<UserAccountMutesRepository, 'listMutedForMuters'>>;
  let governanceResolver: jest.Mocked<
    Pick<GovernanceResolverService, 'resolveMergedForObjectView'>
  >;
  let endpoint: GetObjectThreadsFeedEndpoint;

  beforeEach(() => {
    threadsRepo = {
      findObjectThreadsFeed: jest.fn().mockResolvedValue([]),
    };
    objectsCoreRepo = {
      findByObjectIdForPage: jest.fn().mockResolvedValue({ object_id: 'waivio', object_type: 'hashtag' }),
    };
    accounts = { findByNames: jest.fn() };
    userAccountMutesRepo = {
      listMutedForMuters: jest.fn().mockResolvedValue([]),
    };
    governanceResolver = {
      resolveMergedForObjectView: jest
        .fn()
        .mockResolvedValue({ ...DEFAULT_GOVERNANCE_SNAPSHOT, authors: [] }),
    };
    hydrateThreadFeedPageMock.mockResolvedValue({
      items: [],
      cursor: null,
      hasMore: false,
    });
    endpoint = new GetObjectThreadsFeedEndpoint(
      threadsRepo as unknown as ThreadsRepository,
      objectsCoreRepo as unknown as ObjectsCoreRepository,
      accounts as unknown as AccountsCurrentRepository,
      userAccountMutesRepo as unknown as UserAccountMutesRepository,
      governanceResolver as unknown as GovernanceResolverService,
    );
  });

  it('returns null when object id is empty', async () => {
    await expect(
      endpoint.execute('  ', { limit: 20, sort: 'latest', currency: 'USD' }),
    ).resolves.toBeNull();
  });

  it('returns null when object does not exist', async () => {
    objectsCoreRepo.findByObjectIdForPage.mockResolvedValue(undefined);
    await expect(
      endpoint.execute('missing', { limit: 20, sort: 'latest', currency: 'USD' }),
    ).resolves.toBeNull();
  });

  it('returns empty feed for invalid cursor', async () => {
    const r = await endpoint.execute(
      'waivio',
      { limit: 20, cursor: 'not-a-cursor', sort: 'latest', currency: 'USD' },
    );
    expect(r).toEqual({ items: [], cursor: null, hasMore: false });
    expect(threadsRepo.findObjectThreadsFeed).not.toHaveBeenCalled();
  });

  it('loads muted authors for viewer and queries by object id', async () => {
    userAccountMutesRepo.listMutedForMuters.mockResolvedValue(['muted-user']);
    const rows = [threadRow('alice', 't-1', 100)];
    threadsRepo.findObjectThreadsFeed.mockResolvedValue(rows);
    hydrateThreadFeedPageMock.mockResolvedValue({
      items: [{ id: 'alice/t-1' } as never],
      cursor: null,
      hasMore: false,
    });

    await endpoint.execute(
      'waivio',
      { limit: 20, sort: 'latest', currency: 'USD' },
      'viewer',
    );

    expect(userAccountMutesRepo.listMutedForMuters).toHaveBeenCalledWith(['viewer']);
    expect(threadsRepo.findObjectThreadsFeed).toHaveBeenCalledWith(
      'waivio',
      ['muted-user'],
      null,
      'latest',
      21,
      undefined,
    );
    expect(hydrateThreadFeedPageMock).toHaveBeenCalledWith(
      expect.objectContaining({ threadsRepo, accounts }),
      rows,
      20,
      'viewer',
    );
  });

  it('passes decoded cursor to repository', async () => {
    const cursor = encodeFeedCursor({ feedAt: 100, author: 'alice', permlink: 't-1' });
    await endpoint.execute(
      'waivio',
      { limit: 10, cursor, sort: 'oldest', currency: 'USD' },
    );
    expect(threadsRepo.findObjectThreadsFeed).toHaveBeenCalledWith(
      'waivio',
      [],
      { feedAt: 100, author: 'alice', permlink: 't-1' },
      'oldest',
      11,
      undefined,
    );
  });

  it('uses header governance authors as the allowlist and keeps viewer mutes only', async () => {
    governanceResolver.resolveMergedForObjectView.mockResolvedValue({
      ...DEFAULT_GOVERNANCE_SNAPSHOT,
      authors: ['alice'],
    });
    userAccountMutesRepo.listMutedForMuters.mockResolvedValue(['muted-user']);

    await endpoint.execute(
      'waivio',
      { limit: 20, sort: 'latest', currency: 'USD', authors_only: true },
      'viewer',
      'gov-h',
    );

    expect(governanceResolver.resolveMergedForObjectView).toHaveBeenCalledWith('gov-h');
    expect(threadsRepo.findObjectThreadsFeed).toHaveBeenCalledWith(
      'waivio',
      ['muted-user'],
      null,
      'latest',
      21,
      ['alice'],
    );
  });

  it('returns an empty page without querying when authors_only and the allowlist is empty', async () => {
    const r = await endpoint.execute('waivio', {
      limit: 20,
      sort: 'latest',
      currency: 'USD',
      authors_only: true,
    });
    expect(r).toEqual({ items: [], cursor: null, hasMore: false });
    expect(threadsRepo.findObjectThreadsFeed).not.toHaveBeenCalled();
  });
});
