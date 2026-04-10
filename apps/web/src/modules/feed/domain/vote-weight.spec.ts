import {
  defaultResolveVoteWeight,
  HIVE_VOTE_WEIGHT_CLEAR,
  HIVE_VOTE_WEIGHT_FULL,
} from './vote-weight';

describe('defaultResolveVoteWeight', () => {
  it('returns full weight when not currently voted', () => {
    expect(defaultResolveVoteWeight({ currentlyVoted: false })).toBe(HIVE_VOTE_WEIGHT_FULL);
  });

  it('returns clear when currently voted', () => {
    expect(defaultResolveVoteWeight({ currentlyVoted: true })).toBe(HIVE_VOTE_WEIGHT_CLEAR);
  });
});
