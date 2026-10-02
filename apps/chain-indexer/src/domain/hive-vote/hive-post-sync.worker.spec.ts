import { HivePostSyncWorker } from './hive-post-sync.worker';
import { PostSyncQueueRow } from '@opden-data-layer/odl-db-types';

function row(partial: Partial<PostSyncQueueRow>): PostSyncQueueRow {
  return {
    author: 'alice',
    permlink: 'p',
    enqueued_at: 1_000,
    needs_post_create: false,
    attempts: 1,
    last_attempt_at: null,
    ...partial,
  };
}

function mockSchedulerRegistry() {
  return {
    addInterval: jest.fn(),
    deleteInterval: jest.fn(),
  };
}

function createWorker(deps: {
  configGet?: jest.Mock;
  claimBatch: jest.Mock;
  deleteOne?: jest.Mock;
  resetAttempt?: jest.Mock;
  syncActiveVotesFromHive?: jest.Mock;
  updateHivePayoutFields?: jest.Mock;
  findSourcePostForReblog?: jest.Mock;
  insertRebloggedUser?: jest.Mock;
  findByPost?: jest.Mock;
  deleteByPost?: jest.Mock;
  deletePendingOne?: jest.Mock;
  ensurePostFromHiveForVoteSync?: jest.Mock;
  getActiveVotes?: jest.Mock;
  getContent?: jest.Mock;
}) {
  const deleteOne = deps.deleteOne ?? jest.fn().mockResolvedValue(undefined);
  const resetAttempt = deps.resetAttempt ?? jest.fn().mockResolvedValue(undefined);
  const syncActiveVotesFromHive =
    deps.syncActiveVotesFromHive ?? jest.fn().mockResolvedValue(undefined);
  const updateHivePayoutFields =
    deps.updateHivePayoutFields ?? jest.fn().mockResolvedValue(undefined);
  const findSourcePostForReblog =
    deps.findSourcePostForReblog ?? jest.fn().mockResolvedValue(undefined);
  const insertRebloggedUser =
    deps.insertRebloggedUser ?? jest.fn().mockResolvedValue(undefined);
  const findByPost = deps.findByPost ?? jest.fn().mockResolvedValue([]);
  const deleteByPost = deps.deleteByPost ?? jest.fn().mockResolvedValue(undefined);
  const deletePendingOne =
    deps.deletePendingOne ?? jest.fn().mockResolvedValue(undefined);
  const ensurePostFromHiveForVoteSync =
    deps.ensurePostFromHiveForVoteSync ?? jest.fn().mockResolvedValue('ready');
  const getActiveVotes = deps.getActiveVotes ?? jest.fn().mockResolvedValue([]);
  const getContent =
    deps.getContent ??
    jest.fn().mockResolvedValue({
      author: 'alice',
      permlink: 'p',
      pending_payout_value: '1.000 HBD',
      net_rshares: 100,
    });

  const worker = new HivePostSyncWorker(
    { get: deps.configGet ?? jest.fn().mockReturnValue(50) } as never,
    mockSchedulerRegistry() as never,
    {
      claimBatch: deps.claimBatch,
      deleteOne,
      resetAttempt,
    } as never,
    {
      syncActiveVotesFromHive,
      updateHivePayoutFields,
      findSourcePostForReblog,
      insertRebloggedUser,
    } as never,
    {
      findByPost,
      deleteByPost,
      deleteOne: deletePendingOne,
    } as never,
    { ensurePostFromHiveForVoteSync } as never,
    { getActiveVotes, getContent } as never,
  );

  return {
    worker,
    deleteOne,
    resetAttempt,
    syncActiveVotesFromHive,
    updateHivePayoutFields,
    findSourcePostForReblog,
    insertRebloggedUser,
    findByPost,
    deleteByPost,
    deletePendingOne,
    ensurePostFromHiveForVoteSync,
    getActiveVotes,
    getContent,
  };
}

describe('HivePostSyncWorker', () => {
  it('calls getActiveVotes, syncs votes and payout, then deletes queue', async () => {
    const { worker, getActiveVotes, getContent, syncActiveVotesFromHive, updateHivePayoutFields, deleteOne, resetAttempt } =
      createWorker({
        claimBatch: jest.fn().mockResolvedValue([row({ needs_post_create: false })]),
      });

    await worker.runPostSyncBatch();

    expect(getActiveVotes).toHaveBeenCalledWith('alice', 'p');
    expect(getContent).toHaveBeenCalledWith('alice', 'p');
    expect(syncActiveVotesFromHive).toHaveBeenCalledWith('alice', 'p', []);
    expect(updateHivePayoutFields).toHaveBeenCalledWith(
      'alice',
      'p',
      expect.objectContaining({ pending_payout_value: '1.000 HBD' }),
    );
    expect(deleteOne).toHaveBeenCalledWith('alice', 'p');
    expect(resetAttempt).not.toHaveBeenCalled();
  });

  it('creates post when needs_post_create then syncs votes', async () => {
    const getActiveVotes = jest
      .fn()
      .mockResolvedValue([{ voter: 'v', weight: 1, percent: 1, reputation: 0, rshares: 10 }]);
    const { worker, ensurePostFromHiveForVoteSync, deleteOne } = createWorker({
      claimBatch: jest.fn().mockResolvedValue([row({ needs_post_create: true, attempts: 1 })]),
      getActiveVotes,
      getContent: jest.fn().mockResolvedValue({ author: 'alice', permlink: 'p' }),
    });

    await worker.runPostSyncBatch();

    expect(ensurePostFromHiveForVoteSync).toHaveBeenCalled();
    expect(getActiveVotes).toHaveBeenCalled();
    expect(deleteOne).toHaveBeenCalledWith('alice', 'p');
  });

  it('resets attempt when getActiveVotes fails', async () => {
    const { worker, resetAttempt } = createWorker({
      claimBatch: jest.fn().mockResolvedValue([row({ needs_post_create: false })]),
      getActiveVotes: jest.fn().mockRejectedValue(new Error('rpc down')),
    });

    await worker.runPostSyncBatch();

    expect(resetAttempt).toHaveBeenCalledWith('alice', 'p');
  });

  it('deletes queue and pending when Hive has no post after max attempts', async () => {
    const { worker, deleteOne, deleteByPost, resetAttempt, getActiveVotes } = createWorker({
      configGet: jest.fn((key: string, def: number) => def),
      claimBatch: jest.fn().mockResolvedValue([row({ needs_post_create: true, attempts: 5 })]),
      ensurePostFromHiveForVoteSync: jest.fn().mockResolvedValue('not_found'),
    });

    await worker.runPostSyncBatch();

    expect(deleteByPost).toHaveBeenCalledWith('alice', 'p');
    expect(deleteOne).toHaveBeenCalledWith('alice', 'p');
    expect(resetAttempt).not.toHaveBeenCalled();
    expect(getActiveVotes).not.toHaveBeenCalled();
  });

  it('deletes queue and pending immediately when target is a comment', async () => {
    const { worker, deleteOne, deleteByPost, resetAttempt, insertRebloggedUser } = createWorker({
      claimBatch: jest.fn().mockResolvedValue([row({ needs_post_create: true, attempts: 1 })]),
      ensurePostFromHiveForVoteSync: jest.fn().mockResolvedValue('is_comment'),
    });

    await worker.runPostSyncBatch();

    expect(deleteByPost).toHaveBeenCalledWith('alice', 'p');
    expect(deleteOne).toHaveBeenCalledWith('alice', 'p');
    expect(resetAttempt).not.toHaveBeenCalled();
    expect(insertRebloggedUser).not.toHaveBeenCalled();
  });

  it('deletes queue and pending when the author is governance-muted', async () => {
    const { worker, deleteOne, deleteByPost, insertRebloggedUser } = createWorker({
      claimBatch: jest.fn().mockResolvedValue([row({ needs_post_create: true, attempts: 1 })]),
      ensurePostFromHiveForVoteSync: jest.fn().mockResolvedValue('muted'),
    });

    await worker.runPostSyncBatch();

    expect(deleteByPost).toHaveBeenCalledWith('alice', 'p');
    expect(deleteOne).toHaveBeenCalledWith('alice', 'p');
    expect(insertRebloggedUser).not.toHaveBeenCalled();
  });

  it('resets attempt when ensurePostFromHiveForVoteSync throws', async () => {
    const { worker, resetAttempt } = createWorker({
      claimBatch: jest.fn().mockResolvedValue([row({ needs_post_create: true, attempts: 1 })]),
      ensurePostFromHiveForVoteSync: jest.fn().mockRejectedValue(new Error('network')),
    });

    await worker.runPostSyncBatch();

    expect(resetAttempt).toHaveBeenCalledWith('alice', 'p');
  });

  it('drains pending reblogs with the stored block time after ready', async () => {
    const pendingTs = Math.floor(Date.parse('2023-10-23T23:46:06Z') / 1000);
    const { worker, insertRebloggedUser, deletePendingOne, findSourcePostForReblog } =
      createWorker({
        claimBatch: jest.fn().mockResolvedValue([row({ needs_post_create: true })]),
        findByPost: jest.fn().mockResolvedValue([
          {
            author: 'alice',
            permlink: 'p',
            account: 'grampo',
            reblogged_at_unix: pendingTs,
          },
        ]),
        findSourcePostForReblog: jest.fn().mockResolvedValue({
          author: 'root-alice',
          permlink: 'root-p',
        }),
      });

    await worker.runPostSyncBatch();

    expect(findSourcePostForReblog).toHaveBeenCalledWith('alice', 'p');
    expect(insertRebloggedUser).toHaveBeenCalledWith({
      author: 'root-alice',
      permlink: 'root-p',
      account: 'grampo',
      reblogged_at_unix: pendingTs,
    });
    expect(deletePendingOne).toHaveBeenCalledWith('alice', 'p', 'grampo');
  });
});
