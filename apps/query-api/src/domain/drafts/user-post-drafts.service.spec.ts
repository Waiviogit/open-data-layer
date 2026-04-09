import { NotFoundException } from '@nestjs/common';
import type { Post, UserPostDraft } from '@opden-data-layer/core';
import { PostsRepository } from '../../repositories/posts.repository';
import { UserPostDraftsRepository } from '../../repositories/user-post-drafts.repository';
import { UserPostDraftsService } from './user-post-drafts.service';

function draftRow(overrides: Partial<UserPostDraft> = {}): UserPostDraft {
  return {
    author: 'alice',
    draft_id: 'd1',
    title: 't',
    body: 'b',
    json_metadata: {},
    parent_author: '',
    parent_permlink: '',
    permlink: 'p1',
    beneficiaries: [],
    last_updated: 1,
    ...overrides,
  };
}

function postRow(overrides: Partial<Post> = {}): Post {
  return {
    author: 'alice',
    permlink: 'p1',
    hive_id: null,
    author_reputation: BigInt(0),
    author_weight: 0,
    parent_author: '',
    parent_permlink: '',
    title: 'pt',
    body: 'pb',
    json_metadata: '{"foo":1}',
    app: null,
    depth: 0,
    category: null,
    last_update: null,
    created: null,
    active: null,
    last_payout: null,
    children: 0,
    net_rshares: BigInt(0),
    abs_rshares: BigInt(0),
    vote_rshares: BigInt(0),
    children_abs_rshares: null,
    cashout_time: null,
    reward_weight: null,
    total_payout_value: '0',
    curator_payout_value: '0',
    author_rewards: null,
    net_votes: null,
    root_author: '',
    root_permlink: '',
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
    created_unix: 100,
    ...overrides,
  };
}

describe('UserPostDraftsService', () => {
  let draftsRepo: jest.Mocked<
    Pick<
      UserPostDraftsRepository,
      | 'findByAuthorAndDraftId'
      | 'findByAuthorAndPermlink'
      | 'insert'
      | 'listByAuthorKeyset'
      | 'deleteByAuthorAndDraftIds'
    >
  >;
  let postsRepo: jest.Mocked<Pick<PostsRepository, 'findPostsByKeys'>>;
  let service: UserPostDraftsService;

  beforeEach(() => {
    draftsRepo = {
      findByAuthorAndDraftId: jest.fn(),
      findByAuthorAndPermlink: jest.fn(),
      insert: jest.fn(),
      listByAuthorKeyset: jest.fn(),
      deleteByAuthorAndDraftIds: jest.fn(),
    };
    postsRepo = {
      findPostsByKeys: jest.fn(),
    };
    service = new UserPostDraftsService(
      draftsRepo as unknown as UserPostDraftsRepository,
      postsRepo as unknown as PostsRepository,
    );
  });

  it('getOne by draftId returns view when row exists', async () => {
    const row = draftRow();
    draftsRepo.findByAuthorAndDraftId.mockResolvedValue(row);

    const v = await service.getOne('alice', 'd1', undefined);
    expect(v.draftId).toBe('d1');
    expect(draftsRepo.findByAuthorAndPermlink).not.toHaveBeenCalled();
    expect(postsRepo.findPostsByKeys).not.toHaveBeenCalled();
  });

  it('getOne by draftId throws when missing', async () => {
    draftsRepo.findByAuthorAndDraftId.mockResolvedValue(null);
    await expect(service.getOne('alice', 'missing', undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getOne by permlink returns existing draft', async () => {
    const row = draftRow();
    draftsRepo.findByAuthorAndPermlink.mockResolvedValue(row);

    const v = await service.getOne('alice', undefined, 'p1');
    expect(v.permlink).toBe('p1');
    expect(postsRepo.findPostsByKeys).not.toHaveBeenCalled();
  });

  it('getOne by permlink creates draft from post when no draft', async () => {
    draftsRepo.findByAuthorAndPermlink.mockResolvedValue(null);
    postsRepo.findPostsByKeys.mockResolvedValue([postRow()]);
    const created = draftRow({ draft_id: 'new-id' });
    draftsRepo.insert.mockResolvedValue(created);

    const v = await service.getOne('alice', undefined, 'p1');
    expect(v.draftId).toBe('new-id');
    expect(draftsRepo.insert).toHaveBeenCalledTimes(1);
    const insertArg = draftsRepo.insert.mock.calls[0][0];
    expect(insertArg.author).toBe('alice');
    expect(insertArg.permlink).toBe('p1');
    expect(insertArg.title).toBe('pt');
  });

  it('getOne by permlink throws 404 when no draft and no post', async () => {
    draftsRepo.findByAuthorAndPermlink.mockResolvedValue(null);
    postsRepo.findPostsByKeys.mockResolvedValue([]);

    await expect(service.getOne('alice', undefined, 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(draftsRepo.insert).not.toHaveBeenCalled();
  });

  it('deleteMany returns deleted count from repository', async () => {
    draftsRepo.deleteByAuthorAndDraftIds.mockResolvedValue(2);
    const id1 = '550e8400-e29b-41d4-a716-446655440000';
    const id2 = '550e8400-e29b-41d4-a716-446655440001';

    const r = await service.deleteMany('alice', { draftIds: [id1, id2] });

    expect(r.deleted).toBe(2);
    expect(draftsRepo.deleteByAuthorAndDraftIds).toHaveBeenCalledWith('alice', [id1, id2]);
  });
});
