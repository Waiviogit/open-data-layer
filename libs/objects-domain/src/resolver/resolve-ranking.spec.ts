import type { GovernanceSnapshot } from '../types/governance-snapshot';
import type { VoterWaivPowerMap } from '../types/aggregated-object';
import { ObjectOwnership, RankVote } from '@opden-data-layer/odl-db-types';
import { computeUpdateRankPersistence } from './resolve-ranking';

const EMPTY_GOVERNANCE: GovernanceSnapshot = {
  admins: [],
  trusted: [],
  moderators: [],
  validity_cutoff: [],
  restricted: [],
  whitelist: [],
  authorities: [],
  authors: [],
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

function makeOwnership(account: string): ObjectOwnership {
  return {
    object_id: 'obj1',
    account,
    ownership_type: 'exclusive',
    event_seq: BigInt(1),
    created_at: new Date(),
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

  it('admin rank wins when E is empty', () => {
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    const votes = [makeRankVote('u1', 'admin1', 500, BigInt(20)), makeRankVote('u1', 'bob', 100)];
    const powers: VoterWaivPowerMap = new Map();
    const r = computeUpdateRankPersistence(votes, governance, powers, 'winner');
    expect(r.rank_score).toBe(500);
    expect(r.rank_context).toBe('default');
    expect(r.rank_decisive_event_seq).toBe(BigInt(20));
  });

  it('exclusive-admin rank wins over non-exclusive admin rank', () => {
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2'] };
    const ownerships = [makeOwnership('admin1')];
    const votes = [
      makeRankVote('u1', 'admin1', 100, BigInt(10)),
      makeRankVote('u1', 'admin2', 9000, BigInt(20)),
    ];
    const powers: VoterWaivPowerMap = new Map();
    const r = computeUpdateRankPersistence(votes, governance, powers, 'winner', ownerships);
    expect(r.rank_score).toBe(100);
    expect(r.rank_decisive_event_seq).toBe(BigInt(10));
  });

  it('second exclusive-admin later rank wins', () => {
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'dave'] };
    const ownerships = [makeOwnership('admin1'), makeOwnership('dave')];
    const votes = [
      makeRankVote('u1', 'admin1', 100, BigInt(10)),
      makeRankVote('u1', 'dave', 50, BigInt(30)),
    ];
    const powers: VoterWaivPowerMap = new Map();
    const r = computeUpdateRankPersistence(votes, governance, powers, 'winner', ownerships);
    expect(r.rank_score).toBe(50);
    expect(r.rank_decisive_event_seq).toBe(BigInt(30));
  });

  it('no E rank: community rank wins over non-exclusive admin', () => {
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2'] };
    const ownerships = [makeOwnership('admin1')];
    const votes = [
      makeRankVote('u1', 'admin2', 500, BigInt(5)),
      makeRankVote('u1', 'mallory', 0, BigInt(8)),
    ];
    const powers: VoterWaivPowerMap = new Map([['mallory', 100]]);
    const r = computeUpdateRankPersistence(votes, governance, powers, 'winner', ownerships);
    expect(r.rank_score).toBe(0);
    expect(r.rank_decisive_event_seq).toBe(BigInt(8));
  });

  it('trusted rank wins when no admin and E is empty', () => {
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

  it('average: weighted mean ignores exclusive filter', () => {
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1', 'admin2'] };
    const ownerships = [makeOwnership('admin1')];
    const votes = [
      makeRankVote('u1', 'admin1', 10000, BigInt(1)),
      makeRankVote('u1', 'admin2', 0, BigInt(2)),
    ];
    const powers: VoterWaivPowerMap = new Map([
      ['admin1', 100],
      ['admin2', 1],
    ]);
    const r = computeUpdateRankPersistence(votes, governance, powers, 'average', ownerships);
    expect(r.rank_score).toBe(9901);
    expect(r.rank_context).toBeNull();
    expect(r.rank_decisive_event_seq).toBeNull();
  });
});
