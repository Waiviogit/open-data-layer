import type { ResolvedUpdate } from '../types/resolved-view';
import { compareResolvedUpdatesByRanking } from './resolve-ranking';

/**
 * For single-cardinality update types: among all VALID updates, pick the one
 * with the Highest event_seq (Last Write Wins across same creator scope).
 *
 * Per spec vote-semantics.md §D: LWW key scope is (object_id, field_key, creator).
 * Since we operate per (object_id, update_type) group here, we pick the VALID
 * update with the highest event_seq globally as the winner.
 *
 * @see docs/spec/vote-semantics.md §D
 */
export function resolveSingleCardinality(updates: ResolvedUpdate[]): ResolvedUpdate[] {
  const valid = updates.filter((u) => u.validity_status === 'VALID');
  if (valid.length === 0) return [];

  const winner = valid.reduce((best, u) => {
    if (u.event_seq > best.event_seq) {
      return u;
    }
    if (u.event_seq < best.event_seq) {
      return best;
    }
    return u.update_id < best.update_id ? u : best;
  });
  return [winner];
}

/**
 * For multi-cardinality update types: return all VALID updates ordered by
 * persisted rank fields on each update (`rank_score`, `rank_decisive_event_seq`, …).
 *
 * @see docs/spec/vote-semantics.md §B
 */
export function resolveMultiCardinality(updates: ResolvedUpdate[]): ResolvedUpdate[] {
  const valid = updates.filter((u) => u.validity_status === 'VALID');
  return [...valid].sort(compareResolvedUpdatesByRanking);
}
