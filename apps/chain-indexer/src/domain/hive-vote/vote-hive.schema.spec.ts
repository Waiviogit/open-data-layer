import { voteOperationSchema } from './vote-hive.schema';

describe('voteOperationSchema', () => {
  it('parses a valid upvote', () => {
    const r = voteOperationSchema.safeParse({
      voter: 'alice',
      author: 'bob',
      permlink: 'post',
      weight: 5000,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.weight).toBe(5000);
    }
  });

  it('coerces string weight to number', () => {
    const r = voteOperationSchema.safeParse({
      voter: 'a',
      author: 'b',
      permlink: 'c',
      weight: '-100',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.weight).toBe(-100);
    }
  });

  it('accepts weight 0 (unvote)', () => {
    const r = voteOperationSchema.safeParse({
      voter: 'a',
      author: 'b',
      permlink: 'c',
      weight: 0,
    });
    expect(r.success).toBe(true);
  });

  it('accepts boundary weights', () => {
    expect(
      voteOperationSchema.safeParse({
        voter: 'a',
        author: 'b',
        permlink: 'c',
        weight: 10000,
      }).success,
    ).toBe(true);
    expect(
      voteOperationSchema.safeParse({
        voter: 'a',
        author: 'b',
        permlink: 'c',
        weight: -10000,
      }).success,
    ).toBe(true);
  });

  it('rejects weight out of range', () => {
    expect(
      voteOperationSchema.safeParse({
        voter: 'a',
        author: 'b',
        permlink: 'c',
        weight: 10001,
      }).success,
    ).toBe(false);
  });
});
