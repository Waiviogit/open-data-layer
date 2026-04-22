import type { RankVote } from '@opden-data-layer/core';
import type { GovernanceSnapshot } from '../types/governance-snapshot';
import type { ResolvedUpdate } from '../types/resolved-view';
import { resolveAverageRanking, resolveRanking } from './resolve-ranking';

/**
 * For single-cardinality update types: among all VALID updates, pick the one
 * with the highest event_seq (Last Write Wins across same creator scope).
 *
 * Per spec vote-semantics.md §D: LWW key scope is (object_id, field_key, creator).
 * Since we operate per (object_id, update_type) group here, we pick the VALID
 * update with the highest event_seq globally as the winner.
 *
 * Returns a list with at most one entry (the winner), or empty if no VALID updates exist.
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
    // Tie: deterministic total order — update_id ASC
    return u.update_id < best.update_id ? u : best;
  });
  return [winner];
}

/**
 * For multi-cardinality update types: return all VALID updates ordered by ranking.
 *
 * `rankAggregation` `'average'` uses the mean of all rank votes per update.
 * `'winner'` or omitted uses decisive admin/trusted rank (LWAW).
 *
 * @see docs/spec/vote-semantics.md §B
 */
export function resolveMultiCardinality(
  updates: ResolvedUpdate[],
  rankVotes: RankVote[],
  governance: GovernanceSnapshot,
  rankAggregation?: 'average' | 'winner',
): ResolvedUpdate[] {
  const valid = updates.filter((u) => u.validity_status === 'VALID');
  if (rankAggregation === 'average') {
    return resolveAverageRanking(valid, rankVotes);
  }
  return resolveRanking(valid, rankVotes, governance);
}
