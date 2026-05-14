import type { ObjectUpdate } from '@opden-data-layer/core';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import { applyAggregateRatingRankScoreFallback } from './aggregated-object.repository';

describe('applyAggregateRatingRankScoreFallback', () => {
  const base = (overrides: Partial<ObjectUpdate>): ObjectUpdate =>
    ({
      update_id: 'u1',
      object_id: 'o1',
      update_type: UPDATE_TYPES.AGGREGATE_RATING,
      creator: 'alice',
      locale: 'en-US',
      created_at_unix: 1,
      event_seq: BigInt(1),
      transaction_id: 'tx',
      value_text: 'Overall',
      value_geo: null,
      value_json: null,
      value_text_normalized: 'overall',
      search_vector: null,
      rank_score: null,
      rank_context: null,
      rank_decisive_event_seq: null,
      ...overrides,
    }) as ObjectUpdate;

  it('fills null rank_score from mean rank_votes map', () => {
    const out = applyAggregateRatingRankScoreFallback(
      [base({ update_id: 'r1', rank_score: null })],
      new Map([['r1', 9500]]),
    );
    expect(out[0].rank_score).toBe(9500);
  });

  it('does not override existing rank_score', () => {
    const out = applyAggregateRatingRankScoreFallback(
      [base({ update_id: 'r1', rank_score: 8000 })],
      new Map([['r1', 9500]]),
    );
    expect(out[0].rank_score).toBe(8000);
  });

  it('ignores non-aggregateRating rows', () => {
    const nameRow: ObjectUpdate = {
      ...base({ rank_score: null }),
      update_type: 'name',
    };
    const out = applyAggregateRatingRankScoreFallback(
      [nameRow],
      new Map([['u1', 9000]]),
    );
    expect(out[0].rank_score).toBeNull();
  });
});
