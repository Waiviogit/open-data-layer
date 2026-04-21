import type { RankVote } from '@opden-data-layer/core';
import type { ResolvedUpdate } from '../types/resolved-view';
import type { GovernanceSnapshot } from '../types/governance-snapshot';
import { resolveSingleCardinality, resolveMultiCardinality } from './resolve-cardinality';

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

function makeResolved(
  id: string,
  status: 'VALID' | 'REJECTED',
  eventSeq = BigInt(1),
): ResolvedUpdate {
  return {
    update_id: id,
    update_type: 'name',
    creator: 'alice',
    locale: null,
    created_at_unix: 1000,
    event_seq: eventSeq,
    value_text: `value-${id}`,
    value_geo: null,
    value_json: null,
    validity_status: status,
    field_weight: null,
    rank_score: null,
    rank_context: null,
  };
}

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

describe('resolveSingleCardinality', () => {
  it('returns empty array when no VALID updates', () => {
    const updates = [makeResolved('u1', 'REJECTED'), makeResolved('u2', 'REJECTED')];
    expect(resolveSingleCardinality(updates)).toEqual([]);
  });

  it('returns the single VALID update', () => {
    const updates = [makeResolved('u1', 'VALID')];
    const result = resolveSingleCardinality(updates);
    expect(result).toHaveLength(1);
    expect(result[0].update_id).toBe('u1');
  });

  it('picks the VALID update with highest event_seq (LWW)', () => {
    const updates = [
      makeResolved('u1', 'VALID', BigInt(5)),
      makeResolved('u2', 'VALID', BigInt(10)),
      makeResolved('u3', 'REJECTED', BigInt(20)),
    ];
    const result = resolveSingleCardinality(updates);
    expect(result).toHaveLength(1);
    expect(result[0].update_id).toBe('u2');
  });
});

describe('resolveMultiCardinality', () => {
  it('returns empty array when no VALID updates', () => {
    const updates = [makeResolved('u1', 'REJECTED')];
    expect(resolveMultiCardinality(updates, [], EMPTY_GOVERNANCE)).toEqual([]);
  });

  it('returns all VALID updates when no rank votes', () => {
    const updates = [
      makeResolved('u1', 'VALID', BigInt(5)),
      makeResolved('u2', 'VALID', BigInt(10)),
    ];
    const result = resolveMultiCardinality(updates, [], EMPTY_GOVERNANCE);
    expect(result).toHaveLength(2);
  });

  it('orders by admin rank vote (lower rank = higher position)', () => {
    const updates = [
      makeResolved('u1', 'VALID'),
      makeResolved('u2', 'VALID'),
    ];
    const rankVotes = [
      makeRankVote('u1', 'admin1', 200),
      makeRankVote('u2', 'admin1', 100),
    ];
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    const result = resolveMultiCardinality(updates, rankVotes, governance);
    expect(result[0].update_id).toBe('u2');
    expect(result[1].update_id).toBe('u1');
  });

  it('average aggregation uses mean of all rank votes (not admin decisive)', () => {
    const updates = [makeResolved('u1', 'VALID'), makeResolved('u2', 'VALID')];
    const rankVotes = [
      makeRankVote('u1', 'admin1', 500),
      makeRankVote('u1', 'bob', 100),
      makeRankVote('u2', 'admin1', 50),
    ];
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    const winner = resolveMultiCardinality(updates, rankVotes, governance);
    expect(winner[0].update_id).toBe('u2');
    expect(winner[0].rank_score).toBe(50);

    const avg = resolveMultiCardinality(updates, rankVotes, governance, 'average');
    expect(avg[0].update_id).toBe('u2');
    expect(avg[0].rank_score).toBe(50);
    expect(avg.find((u) => u.update_id === 'u1')?.rank_score).toBe(300);
  });
});
