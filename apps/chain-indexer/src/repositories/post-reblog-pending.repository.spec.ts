import { PostReblogPendingRepository } from './post-reblog-pending.repository';

function leastSqlFromConflict(value: unknown): string {
  const raw = value as { toOperationNode?: () => unknown };
  return JSON.stringify(
    typeof raw.toOperationNode === 'function' ? raw.toOperationNode() : value,
  );
}

describe('PostReblogPendingRepository.upsert', () => {
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

    const repo = new PostReblogPendingRepository(db as never);
    await repo.upsert({
      author: 'cryptodive',
      permlink: 'p',
      account: 'grampo',
      reblogged_at_unix: 1_698_104_766,
    });

    expect(execute).toHaveBeenCalled();
    expect(leastSqlFromConflict(conflictSet?.reblogged_at_unix)).toContain('LEAST');
  });
});
