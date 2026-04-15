import type { AccountSyncQueueRow } from '@opden-data-layer/core';
import { AccountSyncWorker } from './account-sync.worker';

function row(partial: Partial<AccountSyncQueueRow>): AccountSyncQueueRow {
  return {
    account_name: 'alice',
    enqueued_at: 1_000,
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

const hiveAccount = {
  id: 1,
  name: 'alice',
  json_metadata: '{}',
  posting_json_metadata: '{"profile":{"name":"Alice"}}',
  created: '2020-01-01T00:00:00',
  comment_count: 0,
  lifetime_vote_count: 0,
  post_count: 0,
  last_post: '2020-01-01T00:00:00',
  last_root_post: '2020-01-01T00:00:00',
};

describe('AccountSyncWorker', () => {
  it('upserts account, syncs graph, and deletes queue', async () => {
    const claimBatch = jest.fn().mockResolvedValue([row({ attempts: 1 })]);
    const deleteOne = jest.fn().mockResolvedValue(undefined);
    const resetAttempt = jest.fn().mockResolvedValue(undefined);
    const upsertFromHive = jest.fn().mockResolvedValue(undefined);
    const bulkInsertSubscriptions = jest.fn().mockResolvedValue(undefined);
    const bulkInsertMutes = jest.fn().mockResolvedValue(undefined);
    const getAccounts = jest.fn().mockResolvedValue([hiveAccount]);
    const getFollowers = jest.fn().mockResolvedValue([]);
    const getFollowing = jest.fn().mockResolvedValue([]);
    const getMutedList = jest.fn().mockResolvedValue([]);

    const worker = new AccountSyncWorker(
      { get: jest.fn().mockReturnValue(20) } as never,
      mockSchedulerRegistry() as never,
      {
        claimBatch,
        deleteOne,
        resetAttempt,
      } as never,
      { upsertFromHive } as never,
      { bulkInsertSubscriptions, bulkInsertMutes } as never,
      { getAccounts, getFollowers, getFollowing, getMutedList } as never,
    );

    await worker.runAccountSyncBatch();

    expect(claimBatch).toHaveBeenCalled();
    expect(getAccounts).toHaveBeenCalledWith(['alice']);
    expect(upsertFromHive).toHaveBeenCalledWith(hiveAccount);
    expect(bulkInsertSubscriptions).toHaveBeenCalledTimes(2);
    expect(bulkInsertMutes).toHaveBeenCalledWith([]);
    expect(deleteOne).toHaveBeenCalledWith('alice');
    expect(resetAttempt).not.toHaveBeenCalled();
  });

  it('deletes queue after max attempts when account missing on Hive', async () => {
    const claimBatch = jest.fn().mockResolvedValue([row({ attempts: 5 })]);
    const deleteOne = jest.fn().mockResolvedValue(undefined);
    const getAccounts = jest.fn().mockResolvedValue([]);

    const configGet = jest.fn((key: string, defaultValue?: number) => {
      if (key === 'accountSync.maxAttempts') {
        return 5;
      }
      if (key === 'accountSync.batchSize') {
        return 20;
      }
      return defaultValue ?? 20;
    });

    const worker = new AccountSyncWorker(
      { get: configGet } as never,
      mockSchedulerRegistry() as never,
      {
        claimBatch,
        deleteOne,
        resetAttempt: jest.fn(),
      } as never,
      { upsertFromHive: jest.fn() } as never,
      { bulkInsertSubscriptions: jest.fn(), bulkInsertMutes: jest.fn() } as never,
      {
        getAccounts,
        getFollowers: jest.fn(),
        getFollowing: jest.fn(),
        getMutedList: jest.fn(),
      } as never,
    );

    await worker.runAccountSyncBatch();

    expect(deleteOne).toHaveBeenCalledWith('alice');
  });
});
