import type { PostSyncQueueRow } from '@opden-data-layer/core';
import { HivePostSyncWorker } from './hive-post-sync.worker';

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

describe('HivePostSyncWorker', () => {
  it('calls getActiveVotes, syncs votes, and deletes queue when post already exists', async () => {
    const claimBatch = jest.fn().mockResolvedValue([row({ needs_post_create: false })]);
    const deleteOne = jest.fn().mockResolvedValue(undefined);
    const resetAttempt = jest.fn().mockResolvedValue(undefined);
    const syncActiveVotesFromHive = jest.fn().mockResolvedValue(undefined);
    const getActiveVotes = jest.fn().mockResolvedValue([]);

    const worker = new HivePostSyncWorker(
      { get: jest.fn().mockReturnValue(50) } as never,
      mockSchedulerRegistry() as never,
      {
        claimBatch,
        deleteOne,
        resetAttempt,
      } as never,
      { syncActiveVotesFromHive } as never,
      { ensurePostFromHiveForVoteSync: jest.fn().mockResolvedValue('ready') } as never,
      { getActiveVotes } as never,
    );

    await worker.runPostSyncBatch();

    expect(claimBatch).toHaveBeenCalled();
    expect(getActiveVotes).toHaveBeenCalledWith('alice', 'p');
    expect(syncActiveVotesFromHive).toHaveBeenCalledWith('alice', 'p', []);
    expect(deleteOne).toHaveBeenCalledWith('alice', 'p');
    expect(resetAttempt).not.toHaveBeenCalled();
  });

  it('creates post when needs_post_create then syncs votes', async () => {
    const claimBatch = jest.fn().mockResolvedValue([row({ needs_post_create: true, attempts: 1 })]);
    const ensurePostFromHiveForVoteSync = jest.fn().mockResolvedValue('ready');
    const getActiveVotes = jest.fn().mockResolvedValue([{ voter: 'v', weight: 1, percent: 1, reputation: 0, rshares: 10 }]);
    const syncActiveVotesFromHive = jest.fn().mockResolvedValue(undefined);
    const deleteOne = jest.fn().mockResolvedValue(undefined);

    const worker = new HivePostSyncWorker(
      { get: jest.fn().mockReturnValue(50) } as never,
      mockSchedulerRegistry() as never,
      {
        claimBatch,
        deleteOne,
        resetAttempt: jest.fn(),
      } as never,
      { syncActiveVotesFromHive } as never,
      { ensurePostFromHiveForVoteSync } as never,
      { getActiveVotes } as never,
    );

    await worker.runPostSyncBatch();

    expect(ensurePostFromHiveForVoteSync).toHaveBeenCalled();
    expect(getActiveVotes).toHaveBeenCalled();
    expect(deleteOne).toHaveBeenCalledWith('alice', 'p');
  });

  it('resets attempt when getActiveVotes fails', async () => {
    const claimBatch = jest.fn().mockResolvedValue([row({ needs_post_create: false })]);
    const resetAttempt = jest.fn().mockResolvedValue(undefined);
    const getActiveVotes = jest.fn().mockRejectedValue(new Error('rpc down'));

    const worker = new HivePostSyncWorker(
      { get: jest.fn().mockReturnValue(50) } as never,
      mockSchedulerRegistry() as never,
      {
        claimBatch,
        deleteOne: jest.fn(),
        resetAttempt,
      } as never,
      { syncActiveVotesFromHive: jest.fn() } as never,
      { ensurePostFromHiveForVoteSync: jest.fn() } as never,
      { getActiveVotes } as never,
    );

    await worker.runPostSyncBatch();

    expect(resetAttempt).toHaveBeenCalledWith('alice', 'p');
  });

  it('deletes queue when Hive has no post after max attempts', async () => {
    const claimBatch = jest
      .fn()
      .mockResolvedValue([row({ needs_post_create: true, attempts: 5 })]);
    const ensurePostFromHiveForVoteSync = jest.fn().mockResolvedValue('not_found');
    const deleteOne = jest.fn().mockResolvedValue(undefined);
    const resetAttempt = jest.fn().mockResolvedValue(undefined);

    const worker = new HivePostSyncWorker(
      { get: jest.fn((key: string, def: number) => def) } as never,
      mockSchedulerRegistry() as never,
      {
        claimBatch,
        deleteOne,
        resetAttempt,
      } as never,
      { syncActiveVotesFromHive: jest.fn() } as never,
      { ensurePostFromHiveForVoteSync } as never,
      { getActiveVotes: jest.fn() } as never,
    );

    await worker.runPostSyncBatch();

    expect(deleteOne).toHaveBeenCalledWith('alice', 'p');
    expect(resetAttempt).not.toHaveBeenCalled();
  });

  it('deletes queue immediately when target is a comment', async () => {
    const claimBatch = jest.fn().mockResolvedValue([row({ needs_post_create: true, attempts: 1 })]);
    const ensurePostFromHiveForVoteSync = jest.fn().mockResolvedValue('is_comment');
    const deleteOne = jest.fn().mockResolvedValue(undefined);
    const resetAttempt = jest.fn().mockResolvedValue(undefined);

    const worker = new HivePostSyncWorker(
      { get: jest.fn().mockReturnValue(50) } as never,
      mockSchedulerRegistry() as never,
      {
        claimBatch,
        deleteOne,
        resetAttempt,
      } as never,
      { syncActiveVotesFromHive: jest.fn() } as never,
      { ensurePostFromHiveForVoteSync } as never,
      { getActiveVotes: jest.fn() } as never,
    );

    await worker.runPostSyncBatch();

    expect(deleteOne).toHaveBeenCalledWith('alice', 'p');
    expect(resetAttempt).not.toHaveBeenCalled();
  });

  it('resets attempt when ensurePostFromHiveForVoteSync throws', async () => {
    const claimBatch = jest.fn().mockResolvedValue([row({ needs_post_create: true, attempts: 1 })]);
    const resetAttempt = jest.fn().mockResolvedValue(undefined);
    const ensurePostFromHiveForVoteSync = jest.fn().mockRejectedValue(new Error('network'));

    const worker = new HivePostSyncWorker(
      { get: jest.fn().mockReturnValue(50) } as never,
      mockSchedulerRegistry() as never,
      {
        claimBatch,
        deleteOne: jest.fn(),
        resetAttempt,
      } as never,
      { syncActiveVotesFromHive: jest.fn() } as never,
      { ensurePostFromHiveForVoteSync } as never,
      { getActiveVotes: jest.fn() } as never,
    );

    await worker.runPostSyncBatch();

    expect(resetAttempt).toHaveBeenCalledWith('alice', 'p');
  });
});
