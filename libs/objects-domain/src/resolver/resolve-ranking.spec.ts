import type { RankVote } from '@opden-data-layer/core';
import type { GovernanceSnapshot } from '../types/governance-snapshot';
import type { VoterWaivPowerMap } from '../types/aggregated-object';
import { computeUpdateRankPersistence } from './resolve-ranking';

const EMPTY_GOVERNANCE: GovernanceSnapshot = {
  admins: [],
  trusted: [],
  moderators: [],
  validity_cutoff: [],
  restricted: [],
  whitelist: [],
  authorities: [],
  banned: [],
  object_control: null,
  muted: [],
  inherits_from: [],
};

function makeRankVote(updateId: string, voter: string, rank: number, eventSeq = BigInt(10)): RankVote {
  return {
    update_id: updateId,
    object_id: 'obj1',
    voter,
    rank,
    rank_context: 'default',
    event_seq: eventSeq,
    transaction_id: 'tx1',
  };
}

describe('computeUpdateRankPersistence', () => {
  it('returns nulls when no rank votes', () => {
    const powers: VoterWaivPowerMap = new Map();
    const r = computeUpdateRankPersistence([], EMPTY_GOVERNANCE, powers, 'winner');
    expect(r.rank_score).toBeNull();
    expect(r.rank_context).toBeNull();
    expect(r.rank_decisive_event_seq).toBeNull();
  });

  it('admin rank wins', () => {
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    const votes = [makeRankVote('u1', 'admin1', 500, BigInt(20)), makeRankVote('u1', 'bob', 100)];
    const powers: VoterWaivPowerMap = new Map();
    const r = computeUpdateRankPersistence(votes, governance, powers, 'winner');
    expect(r.rank_score).toBe(500);
    expect(r.rank_context).toBe('default');
    expect(r.rank_decisive_event_seq).toBe(BigInt(20));
  });

  it('trusted rank wins when no admin', () => {
    const governance = { ...EMPTY_GOVERNANCE, trusted: ['trusted1'] };
    const votes = [makeRankVote('u1', 'trusted1', 50)];
    const powers: VoterWaivPowerMap = new Map();
    const r = computeUpdateRankPersistence(votes, governance, powers, 'winner');
    expect(r.rank_score).toBe(50);
  });

  it('community: rank from voter with highest waiv_power (tie-break latest event_seq)', () => {
    const votes = [
      makeRankVote('u1', 'weak', 10000, BigInt(5)),
      makeRankVote('u1', 'strong', 0, BigInt(10)),
    ];
    const powers: VoterWaivPowerMap = new Map([
      ['weak', 1],
      ['strong', 100],
    ]);
    const r = computeUpdateRankPersistence(votes, EMPTY_GOVERNANCE, powers, 'winner');
    expect(r.rank_score).toBe(0);
    expect(r.rank_decisive_event_seq).toBe(BigInt(10));
  });

  it('average: weighted mean (spec example)', () => {
    const votes = [
      makeRankVote('u1', 'a', 10000, BigInt(1)),
      makeRankVote('u1', 'b', 0, BigInt(2)),
    ];
    const powers: VoterWaivPowerMap = new Map([
      ['a', 100],
      ['b', 1],
    ]);
    const r = computeUpdateRankPersistence(votes, EMPTY_GOVERNANCE, powers, 'average');
    expect(r.rank_score).toBe(9901);
    expect(r.rank_context).toBeNull();
    expect(r.rank_decisive_event_seq).toBeNull();
  });
});
