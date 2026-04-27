import type { Post } from '@opden-data-layer/core';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories/aggregated-object.repository';
import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import { PostsRepository } from '../../repositories/posts.repository';
import { GovernanceResolverService } from '../governance';
import type { ObjectProjectionService } from '../object-projection/object-projection.service';
import { GetPostByKeyEndpoint } from './get-post-by-key.endpoint';

function postRow(overrides: Partial<Post> = {}): Post {
  return {
    author: 'alice',
    permlink: 'my-post',
    hive_id: null,
    author_reputation: BigInt(0),
    author_weight: 0,
    parent_author: '',
    parent_permlink: '',
    title: 'Hello',
    body: '<p>Hi</p>',
    json_metadata: '{}',
    app: null,
    depth: 0,
    category: 'blog',
    last_update: null,
    created: null,
    active: null,
    last_payout: null,
    children: 2,
    net_rshares: BigInt(10),
    abs_rshares: BigInt(0),
    vote_rshares: BigInt(0),
    children_abs_rshares: null,
    cashout_time: null,
    reward_weight: null,
    total_payout_value: '1.000',
    curator_payout_value: '0',
    author_rewards: null,
    net_votes: null,
    root_author: 'alice',
    root_permlink: 'my-post',
    root_title: null,
    max_accepted_payout: '0',
    percent_steem_dollars: null,
    allow_replies: null,
    allow_votes: null,
    allow_curation_rewards: null,
    beneficiaries: [],
    url: null,
    pending_payout_value: '0',
    total_pending_payout_value: '0',
    total_vote_weight: null,
    promoted: null,
    body_length: null,
    net_rshares_waiv: 0,
    total_payout_waiv: 0,
    total_rewards_waiv: 0,
    created_unix: 1_700_000_000,
    ...overrides,
  };
}

describe('GetPostByKeyEndpoint', () => {
  let postsRepo: jest.Mocked<
    Pick<
      PostsRepository,
      'findPostsByKeys' | 'findPostObjectsByKeys' | 'findActiveVoteSummaries'
    >
  >;
  let accounts: jest.Mocked<Pick<AccountsCurrentRepository, 'findByName'>>;
  let aggregatedObjectRepo: jest.Mocked<
    Pick<AggregatedObjectRepository, 'loadByObjectIds'>
  >;
  let objectViewService: jest.Mocked<Pick<ObjectViewService, 'resolve'>>;
  let governanceResolver: jest.Mocked<
    Pick<GovernanceResolverService, 'resolveMergedForObjectView'>
  >;
  let objectProjection: jest.Mocked<Pick<ObjectProjectionService, 'batchProject'>>;
  let endpoint: GetPostByKeyEndpoint;

  beforeEach(() => {
    postsRepo = {
      findPostsByKeys: jest.fn(),
      findPostObjectsByKeys: jest.fn(),
      findActiveVoteSummaries: jest.fn(),
    };
    accounts = {
      findByName: jest.fn(),
    };
    aggregatedObjectRepo = {
      loadByObjectIds: jest.fn(),
    };
    objectViewService = {
      resolve: jest.fn(),
    };
    governanceResolver = {
      resolveMergedForObjectView: jest.fn().mockResolvedValue({}),
    };
    objectProjection = {
      batchProject: jest.fn().mockImplementation(async (views, options) =>
        views.map((v) => ({
          object_id: v.object_id,
          object_type: v.object_type,
          semantic_type: null,
          fields: {},
          hasAdministrativeAuthority:
            options.viewerAccount === 'bob' && v.object_id === 'obj-x',
          hasOwnershipAuthority: false,
        })),
      ),
    };
    endpoint = new GetPostByKeyEndpoint(
      postsRepo as unknown as PostsRepository,
      accounts as unknown as AccountsCurrentRepository,
      aggregatedObjectRepo as unknown as AggregatedObjectRepository,
      objectViewService as unknown as ObjectViewService,
      governanceResolver as unknown as GovernanceResolverService,
      objectProjection as unknown as ObjectProjectionService,
    );
  });

  it('returns null when post is missing', async () => {
    postsRepo.findPostsByKeys.mockResolvedValue([]);
    postsRepo.findPostObjectsByKeys.mockResolvedValue([]);
    postsRepo.findActiveVoteSummaries.mockResolvedValue(new Map());

    const r = await endpoint.execute('alice', 'nope', 'en-US', undefined, undefined);
    expect(r).toBeNull();
    expect(accounts.findByName).not.toHaveBeenCalled();
  });

  it('returns single post view with body and empty objects when none tagged', async () => {
    const p = postRow();
    postsRepo.findPostsByKeys.mockResolvedValue([p]);
    postsRepo.findPostObjectsByKeys.mockResolvedValue([]);
    postsRepo.findActiveVoteSummaries.mockResolvedValue(
      new Map([['alice\0my-post', { totalCount: 0, previewVoters: [], voted: false }]]),
    );
    accounts.findByName.mockResolvedValue(null);

    const r = await endpoint.execute('alice', 'my-post', 'en-US', undefined, undefined);
    expect(r).not.toBeNull();
    if (r == null) {
      throw new Error('expected post');
    }
    expect(r.body).toBe('<p>Hi</p>');
    expect(r.author).toBe('alice');
    expect(r.permlink).toBe('my-post');
    expect(r.objects).toEqual([]);
    expect(r.rebloggedBy).toBeNull();
    expect(r.feedAt).toBe(r.createdAt);
    expect(aggregatedObjectRepo.loadByObjectIds).not.toHaveBeenCalled();
  });

  it('calls batchProject without viewer when viewer is omitted but post has tagged objects', async () => {
    const p = postRow();
    const postObject = {
      author: 'alice',
      permlink: 'my-post',
      object_id: 'obj-x',
      object_type: 'recipe',
      percent: 100,
    };
    postsRepo.findPostsByKeys.mockResolvedValue([p]);
    postsRepo.findPostObjectsByKeys.mockResolvedValue([postObject]);
    postsRepo.findActiveVoteSummaries.mockResolvedValue(
      new Map([['alice\0my-post', { totalCount: 0, previewVoters: [], voted: false }]]),
    );
    accounts.findByName.mockResolvedValue(null);
    aggregatedObjectRepo.loadByObjectIds.mockResolvedValue({
      objects: [
        {
          core: {
            object_id: 'obj-x',
            object_type: 'recipe',
            creator: 'c',
            weight: 1,
            meta_group_id: null,
            canonical: null,
            canonical_creator: null,
            transaction_id: 't',
            seq: 0,
          },
          updates: [],
          validity_votes: [],
          rank_votes: [],
          authorities: [],
        },
      ],
      voterReputations: new Map(),
    });
    objectViewService.resolve.mockReturnValue([
      {
        object_id: 'obj-x',
        object_type: 'recipe',
        fields: {},
      } as ResolvedObjectView,
    ]);

    await endpoint.execute('alice', 'my-post', 'en-US', undefined, undefined);

    expect(objectProjection.batchProject).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ viewerAccount: undefined }),
    );
  });

  it('sets hasAdministrativeAuthority from projection when viewer is bob', async () => {
    const p = postRow();
    const postObject = {
      author: 'alice',
      permlink: 'my-post',
      object_id: 'obj-x',
      object_type: 'recipe',
      percent: 100,
    };
    postsRepo.findPostsByKeys.mockResolvedValue([p]);
    postsRepo.findPostObjectsByKeys.mockResolvedValue([postObject]);
    postsRepo.findActiveVoteSummaries.mockResolvedValue(
      new Map([['alice\0my-post', { totalCount: 0, previewVoters: [], voted: false }]]),
    );
    accounts.findByName.mockResolvedValue(null);
    aggregatedObjectRepo.loadByObjectIds.mockResolvedValue({
      objects: [
        {
          core: {
            object_id: 'obj-x',
            object_type: 'recipe',
            creator: 'c',
            weight: 1,
            meta_group_id: null,
            canonical: null,
            canonical_creator: null,
            transaction_id: 't',
            seq: 0,
          },
          updates: [],
          validity_votes: [],
          rank_votes: [],
          authorities: [],
        },
      ],
      voterReputations: new Map(),
    });
    objectViewService.resolve.mockReturnValue([
      {
        object_id: 'obj-x',
        object_type: 'recipe',
        fields: {},
      } as ResolvedObjectView,
    ]);

    const r = await endpoint.execute('alice', 'my-post', 'en-US', undefined, 'bob');

    expect(objectProjection.batchProject).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ viewerAccount: 'bob' }),
    );
    expect(r?.objects).toHaveLength(1);
    expect(r?.objects[0].hasAdministrativeAuthority).toBe(true);
  });
});
