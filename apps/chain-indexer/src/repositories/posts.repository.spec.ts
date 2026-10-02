import { PostsRepository } from './posts.repository';

describe('PostsRepository.syncActiveVotesFromHive', () => {
  it('does not delete HE-only voters with rshares_waiv > 0', async () => {
    const deleteExecute = jest.fn().mockResolvedValue(undefined);
    const insertExecute = jest.fn().mockResolvedValue(undefined);

    const trx = {
      selectFrom: () => ({
        select: () => ({
          where: () => ({
            where: () => ({
              execute: async () => [
                { voter: 'he-only', rshares_waiv: 3.5 },
                { voter: 'gone', rshares_waiv: null },
              ],
            }),
          }),
        }),
      }),
      deleteFrom: () => ({
        where: () => ({
          where: () => ({
            where: () => ({
              execute: deleteExecute,
            }),
          }),
        }),
      }),
      insertInto: () => ({
        values: () => ({
          onConflict: () => ({
            doUpdateSet: () => ({
              execute: insertExecute,
            }),
            execute: insertExecute,
          }),
        }),
      }),
    };

    const db = {
      transaction: () => ({
        execute: async (fn: (t: typeof trx) => Promise<void>) => fn(trx),
      }),
    };

    const repo = new PostsRepository(db as never);
    await repo.syncActiveVotesFromHive('alice', 'p', [
      { voter: 'hive-voter', weight: 1, percent: 1, reputation: 0, rshares: 10 },
    ]);

    expect(deleteExecute).toHaveBeenCalledTimes(1);
  });
});

function leastSqlFromConflict(value: unknown): string {
  const raw = value as { toOperationNode?: () => unknown };
  return JSON.stringify(
    typeof raw.toOperationNode === 'function' ? raw.toOperationNode() : value,
  );
}

describe('PostsRepository.insertRebloggedUser', () => {
  it('on conflict keeps the earlier reblogged_at_unix via LEAST', async () => {
    let conflictSet: { reblogged_at_unix?: unknown } | undefined;
    const execute = jest.fn().mockResolvedValue(undefined);
    const db = {
      insertInto: () => ({
        values: () => ({
          onConflict: (build: (oc: {
            columns: (cols: string[]) => {
              doUpdateSet: (set: { reblogged_at_unix?: unknown }) => { execute: jest.Mock };
            };
          }) => { execute: jest.Mock }) =>
            build({
              columns: () => ({
                doUpdateSet: (set) => {
                  conflictSet = set;
                  return { execute };
                },
              }),
            }),
        }),
      }),
    };

    const repo = new PostsRepository(db as never);
    await repo.insertRebloggedUser({
      author: 'cryptodive',
      permlink: 'p',
      account: 'grampo',
      reblogged_at_unix: Math.floor(Date.parse('2023-10-23T23:46:06Z') / 1000),
    });

    expect(execute).toHaveBeenCalled();
    expect(leastSqlFromConflict(conflictSet?.reblogged_at_unix)).toContain('LEAST');
  });
});

describe('PostsRepository.incrementWaivRewards', () => {
  function makeRepo(numUpdatedRows: bigint): PostsRepository {
    const executeTakeFirst = jest.fn().mockResolvedValue({ numUpdatedRows });
    const db = {
      updateTable: () => ({
        set: () => ({
          where: () => ({
            where: () => ({
              where: () => ({
                where: () => ({
                  executeTakeFirst,
                }),
              }),
            }),
          }),
        }),
      }),
    };
    return new PostsRepository(db as never);
  }

  it('returns true when update affects a row', async () => {
    const repo = makeRepo(BigInt(1));
    await expect(repo.incrementWaivRewards('alice', 'p', 1.5)).resolves.toBe(
      true,
    );
  });

  it('returns false when rewards_finalized_at blocks the update', async () => {
    const repo = makeRepo(BigInt(0));
    await expect(repo.incrementWaivRewards('alice', 'p', 1.5)).resolves.toBe(
      false,
    );
  });
});
