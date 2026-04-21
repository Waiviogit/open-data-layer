import type { RankVote } from '@opden-data-layer/core';
import type { ResolvedUpdate } from '../types/resolved-view';
import type { GovernanceSnapshot } from '../types/governance-snapshot';
import { resolveAverageRanking, resolveRanking } from './resolve-ranking';

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

function makeResolved(id: string, eventSeq = BigInt(1)): ResolvedUpdate {
  return {
    update_id: id,
    update_type: 'tag',
    creator: 'alice',
    locale: null,
    created_at_unix: 1000,
    event_seq: eventSeq,
    value_text: `value-${id}`,
    value_json: null,
    validity_status: 'VALID',
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

describe('resolveRanking', () => {
  it('returns updates unchanged when no rank votes', () => {
    const updates = [makeResolved('u1'), makeResolved('u2')];
    const result = resolveRanking(updates, [], EMPTY_GOVERNANCE);
    expect(result).toHaveLength(2);
  });

  it('admin rank wins — lower rank score appears first', () => {
    const updates = [makeResolved('u1'), makeResolved('u2')];
    const governance = { ...EMPTY_GOVERNANCE, admins: ['admin1'] };
    const rankVotes = [
      makeRankVote('u1', 'admin1', 500),
      makeRankVote('u2', 'admin1', 100),
    ];
    const result = resolveRanking(updates, rankVotes, governance);
    expect(result[0].update_id).toBe('u2');
    expect(result[0].rank_score).toBe(100);
    expect(result[1].update_id).toBe('u1');
    expect(result[1].rank_score).toBe(500);
  });

  it('trusted rank wins over no vote', () => {
    const updates = [makeResolved('u1'), makeResolved('u2')];
    const governance = { ...EMPTY_GOVERNANCE, trusted: ['trusted1'] };
    const rankVotes = [makeRankVote('u2', 'trusted1', 50)];
    const result = resolveRanking(updates, rankVotes, governance);
    expect(result[0].update_id).toBe('u2');
    expect(result[0].rank_score).toBe(50);
  });

  it('tie-break 3: latest update event_seq DESC when scores equal and no decisive seq', () => {
    const updates = [
      makeResolved('u1', BigInt(5)),
      makeResolved('u2', BigInt(10)),
    ];
    // No rank votes — both have null rank_score, fall through to tie-break 3
    const result = resolveRanking(updates, [], EMPTY_GOVERNANCE);
    expect(result[0].update_id).toBe('u2');
  });

  it('tie-break 4: update_id ASC when event_seqs are equal', () => {
    const updates = [
      makeResolved('u_b', BigInt(5)),
      makeResolved('u_a', BigInt(5)),
    ];
    const result = resolveRanking(updates, [], EMPTY_GOVERNANCE);
    expect(result[0].update_id).toBe('u_a');
  });
});

describe('resolveAverageRanking', () => {
  it('sets rank_score null when no rank votes', () => {
    const updates = [makeResolved('u1'), makeResolved('u2')];
    const result = resolveAverageRanking(updates, []);
    expect(result[0].rank_score).toBeNull();
    expect(result[0].rank_context).toBeNull();
    expect(result[1].rank_score).toBeNull();
  });

  it('computes rounded mean and orders by lower score first', () => {
    const updates = [makeResolved('u1'), makeResolved('u2')];
    const rankVotes = [
      makeRankVote('u1', 'a', 100),
      makeRankVote('u1', 'b', 200),
      makeRankVote('u2', 'c', 50),
    ];
    const result = resolveAverageRanking(updates, rankVotes);
    expect(result[0].update_id).toBe('u2');
    expect(result[0].rank_score).toBe(50);
    expect(result[1].update_id).toBe('u1');
    expect(result[1].rank_score).toBe(150);
  });

  it('tie-break: equal averages use update event_seq DESC', () => {
    const updates = [makeResolved('u1', BigInt(5)), makeResolved('u2', BigInt(10))];
    const rankVotes = [
      makeRankVote('u1', 'a', 100),
      makeRankVote('u2', 'b', 100),
    ];
    const result = resolveAverageRanking(updates, rankVotes);
    expect(result[0].rank_score).toBe(100);
    expect(result[0].update_id).toBe('u2');
    expect(result[1].update_id).toBe('u1');
  });
});
