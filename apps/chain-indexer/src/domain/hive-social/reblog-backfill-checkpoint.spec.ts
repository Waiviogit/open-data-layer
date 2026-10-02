import {
  accountsPendingReblogBackfill,
  markReblogBackfillCompleted,
  parseReblogBackfillCheckpoint,
} from './reblog-backfill-checkpoint';

describe('parseReblogBackfillCheckpoint', () => {
  it('treats a legacy lastAccount cursor as already completed', () => {
    expect(parseReblogBackfillCheckpoint({ lastAccount: 'b' })).toEqual({
      completed: ['b'],
      updatedAt: '',
    });
  });

  it('unions completed[] with lastAccount', () => {
    expect(
      parseReblogBackfillCheckpoint({
        completed: ['a'],
        lastAccount: 'b',
        updatedAt: '2026-10-02T00:00:00.000Z',
      }),
    ).toEqual({
      completed: ['a', 'b'],
      updatedAt: '2026-10-02T00:00:00.000Z',
    });
  });
});

describe('accountsPendingReblogBackfill', () => {
  it('retries a failed account and skips completed ones', () => {
    const pending = accountsPendingReblogBackfill(
      [{ account: 'a' }, { account: 'b' }],
      markReblogBackfillCompleted([], 'b'),
    );
    expect(pending.map((row) => row.account)).toEqual(['a']);
  });

  it('legacy lastAccount=b skips B and still processes A', () => {
    const checkpoint = parseReblogBackfillCheckpoint({ lastAccount: 'b' });
    const pending = accountsPendingReblogBackfill(
      [{ account: 'a' }, { account: 'b' }, { account: 'c' }],
      checkpoint.completed,
    );
    expect(pending.map((row) => row.account)).toEqual(['a', 'c']);
  });
});
