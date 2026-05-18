import type { ResolvedUpdate, ValidityTier } from '../types/resolved-view';
import {
  compareResolvedSingleCardinality,
  resolveSingleCardinality,
  resolveMultiCardinality,
} from './resolve-cardinality';

function makeResolved(
  id: string,
  status: 'VALID' | 'REJECTED',
  opts: {
    eventSeq?: bigint;
    rankScore?: number | null;
    decisiveSeq?: bigint | null;
    createdAtUnix?: number;
    validityTier?: ValidityTier | null;
    decisiveVoteEventSeq?: bigint | null;
    fieldWeight?: number | null;
    approvePercent?: number;
  } = {},
): ResolvedUpdate {
  const {
    eventSeq = BigInt(1),
    rankScore = null,
    decisiveSeq = null,
    createdAtUnix = 1000,
    validityTier = 'baseline',
    decisiveVoteEventSeq = null,
    fieldWeight = null,
    approvePercent = 100,
  } = opts;
  return {
    update_id: id,
    update_type: 'name',
    creator: 'alice',
    locale: null,
    created_at_unix: createdAtUnix,
    event_seq: eventSeq,
    value_text: `value-${id}`,
    value_geo: null,
    value_json: null,
    validity_status: status,
    validity_tier: validityTier,
    decisive_vote_event_seq: decisiveVoteEventSeq,
    approve_percent: approvePercent,
    field_weight: fieldWeight,
    rank_score: rankScore,
    rank_context: null,
    rank_decisive_event_seq: decisiveSeq,
  };
}

describe('compareResolvedSingleCardinality', () => {
  it('admin tier beats community', () => {
    const admin = makeResolved('a', 'VALID', {
      validityTier: 'admin',
      decisiveVoteEventSeq: BigInt(5),
    });
    const comm = makeResolved('c', 'VALID', {
      validityTier: 'community',
      fieldWeight: 99999,
    });
    expect(compareResolvedSingleCardinality(admin, comm)).toBeLessThan(0);
    expect(compareResolvedSingleCardinality(comm, admin)).toBeGreaterThan(0);
  });

  it('among admin rows, later decisive_vote_event_seq wins', () => {
    const earlier = makeResolved('e', 'VALID', {
      validityTier: 'admin',
      decisiveVoteEventSeq: BigInt(5),
    });
    const later = makeResolved('l', 'VALID', {
      validityTier: 'admin',
      decisiveVoteEventSeq: BigInt(100),
    });
    expect(compareResolvedSingleCardinality(later, earlier)).toBeLessThan(0);
  });

  it('community: higher field_weight wins', () => {
    const low = makeResolved('low', 'VALID', { validityTier: 'community', fieldWeight: 10 });
    const high = makeResolved('high', 'VALID', { validityTier: 'community', fieldWeight: 50 });
    expect(compareResolvedSingleCardinality(high, low)).toBeLessThan(0);
  });

  it('community: tie field_weight uses approve_percent', () => {
    const a = makeResolved('a', 'VALID', {
      validityTier: 'community',
      fieldWeight: 5,
      approvePercent: 70,
    });
    const b = makeResolved('b', 'VALID', {
      validityTier: 'community',
      fieldWeight: 5,
      approvePercent: 85,
    });
    expect(compareResolvedSingleCardinality(b, a)).toBeLessThan(0);
  });

  it('baseline: same event_seq uses created_at_unix DESC', () => {
    const old = makeResolved('old', 'VALID', {
      validityTier: 'baseline',
      eventSeq: BigInt(0),
      createdAtUnix: 100,
    });
    const newer = makeResolved('newer', 'VALID', {
      validityTier: 'baseline',
      eventSeq: BigInt(0),
      createdAtUnix: 200,
    });
    expect(compareResolvedSingleCardinality(newer, old)).toBeLessThan(0);
  });

  it('baseline: full tie uses lexicographic update_id', () => {
    const b = makeResolved('bbbb', 'VALID', {
      validityTier: 'baseline',
      eventSeq: BigInt(1),
      createdAtUnix: 50,
    });
    const a = makeResolved('aaaa', 'VALID', {
      validityTier: 'baseline',
      eventSeq: BigInt(1),
      createdAtUnix: 50,
    });
    expect(compareResolvedSingleCardinality(a, b)).toBeLessThan(0);
  });
});

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

  it('picks community candidate with higher field_weight over higher update event_seq', () => {
    const updates = [
      makeResolved('low', 'VALID', {
        validityTier: 'community',
        fieldWeight: 10,
        eventSeq: BigInt(999),
      }),
      makeResolved('high', 'VALID', {
        validityTier: 'community',
        fieldWeight: 50000,
        eventSeq: BigInt(1),
      }),
    ];
    const result = resolveSingleCardinality(updates);
    expect(result[0].update_id).toBe('high');
  });
});

describe('resolveMultiCardinality', () => {
  it('returns empty array when no VALID updates', () => {
    const updates = [makeResolved('u1', 'REJECTED')];
    expect(resolveMultiCardinality(updates)).toEqual([]);
  });

  it('returns all VALID updates when no rank_score (tie-break by event_seq)', () => {
    const updates = [
      makeResolved('u1', 'VALID', { eventSeq: BigInt(5) }),
      makeResolved('u2', 'VALID', { eventSeq: BigInt(10) }),
    ];
    const result = resolveMultiCardinality(updates);
    expect(result).toHaveLength(2);
    expect(result[0].update_id).toBe('u2');
  });

  it('orders by persisted rank_score ascending', () => {
    const updates = [
      makeResolved('u1', 'VALID', { eventSeq: BigInt(1), rankScore: 200 }),
      makeResolved('u2', 'VALID', { eventSeq: BigInt(1), rankScore: 100 }),
    ];
    const result = resolveMultiCardinality(updates);
    expect(result[0].update_id).toBe('u2');
    expect(result[1].update_id).toBe('u1');
  });

  it('tie-break rank_decisive_event_seq DESC when rank_score equal', () => {
    const updates = [
      makeResolved('u1', 'VALID', { eventSeq: BigInt(5), rankScore: 100, decisiveSeq: BigInt(1) }),
      makeResolved('u2', 'VALID', { eventSeq: BigInt(5), rankScore: 100, decisiveSeq: BigInt(10) }),
    ];
    const result = resolveMultiCardinality(updates);
    expect(result[0].update_id).toBe('u2');
  });
});
