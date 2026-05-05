import type { ResolvedUpdate } from '../types/resolved-view';
import { resolveSingleCardinality, resolveMultiCardinality } from './resolve-cardinality';

function makeResolved(
  id: string,
  status: 'VALID' | 'REJECTED',
  eventSeq = BigInt(1),
  rankScore: number | null = null,
  decisiveSeq: bigint | null = null,
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
    rank_score: rankScore,
    rank_context: null,
    rank_decisive_event_seq: decisiveSeq,
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
    expect(resolveMultiCardinality(updates)).toEqual([]);
  });

  it('returns all VALID updates when no rank_score (tie-break by event_seq)', () => {
    const updates = [
      makeResolved('u1', 'VALID', BigInt(5)),
      makeResolved('u2', 'VALID', BigInt(10)),
    ];
    const result = resolveMultiCardinality(updates);
    expect(result).toHaveLength(2);
    expect(result[0].update_id).toBe('u2');
  });

  it('orders by persisted rank_score ascending', () => {
    const updates = [
      makeResolved('u1', 'VALID', BigInt(1), 200),
      makeResolved('u2', 'VALID', BigInt(1), 100),
    ];
    const result = resolveMultiCardinality(updates);
    expect(result[0].update_id).toBe('u2');
    expect(result[1].update_id).toBe('u1');
  });

  it('tie-break rank_decisive_event_seq DESC when rank_score equal', () => {
    const updates = [
      makeResolved('u1', 'VALID', BigInt(5), 100, BigInt(1)),
      makeResolved('u2', 'VALID', BigInt(5), 100, BigInt(10)),
    ];
    const result = resolveMultiCardinality(updates);
    expect(result[0].update_id).toBe('u2');
  });
});
