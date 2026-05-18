import type { ResolvedUpdate, ValidityTier } from '../types/resolved-view';
import { compareResolvedUpdatesByRanking } from './resolve-ranking';

function formatEventSeq(seq: bigint): string {
  return seq.toString();
}

function tierPriority(tier: ValidityTier | null): number {
  if (tier === 'admin') return 3;
  if (tier === 'trusted') return 2;
  if (tier === 'community') return 1;
  return 0;
}

/**
 * Sort order for picking the winning VALID row among single-cardinality candidates.
 * Negative means `a` is strictly preferred over `b` (wins).
 *
 * @see docs/spec/vote-semantics.md — single-cardinality field winner
 */
export function compareResolvedSingleCardinality(a: ResolvedUpdate, b: ResolvedUpdate): number {
  const ta = tierPriority(a.validity_tier);
  const tb = tierPriority(b.validity_tier);
  if (ta !== tb) {
    return tb - ta;
  }

  if (ta >= 2) {
    const as = a.decisive_vote_event_seq;
    const bs = b.decisive_vote_event_seq;
    if (as !== null && bs !== null && as !== bs) {
      return as > bs ? -1 : 1;
    }
  }

  if (ta === 1) {
    const aw = a.field_weight ?? 0;
    const bw = b.field_weight ?? 0;
    if (aw !== bw) {
      return bw > aw ? 1 : -1;
    }
    if (a.approve_percent !== b.approve_percent) {
      return b.approve_percent - a.approve_percent;
    }
  }

  if (a.event_seq !== b.event_seq) {
    return a.event_seq > b.event_seq ? -1 : 1;
  }
  if (a.created_at_unix !== b.created_at_unix) {
    return b.created_at_unix - a.created_at_unix;
  }
  return a.update_id < b.update_id ? -1 : 1;
}

function explainWhyPreferred(winner: ResolvedUpdate, other: ResolvedUpdate): string {
  const ta = tierPriority(winner.validity_tier);
  const tb = tierPriority(other.validity_tier);
  if (ta !== tb) {
    return `tier ${String(winner.validity_tier)} beats tier ${String(other.validity_tier)}`;
  }
  if (ta >= 2) {
    const ws = winner.decisive_vote_event_seq;
    const os = other.decisive_vote_event_seq;
    if (ws !== null && os !== null && ws !== os) {
      return `decisive_vote_event_seq ${formatEventSeq(ws)} > ${formatEventSeq(os)} (LWAW/LWTW vote)`;
    }
  }
  if (ta === 1) {
    const ww = winner.field_weight ?? 0;
    const ow = other.field_weight ?? 0;
    if (ww !== ow) {
      return `field_weight ${ww} > ${ow}`;
    }
    if (winner.approve_percent !== other.approve_percent) {
      return `approve_percent ${winner.approve_percent} > ${other.approve_percent}`;
    }
  }
  if (winner.event_seq !== other.event_seq) {
    return `update event_seq ${formatEventSeq(winner.event_seq)} > ${formatEventSeq(other.event_seq)}`;
  }
  if (winner.created_at_unix !== other.created_at_unix) {
    return `created_at_unix ${winner.created_at_unix} > ${other.created_at_unix}`;
  }
  return `tie-break: smaller update_id (${winner.update_id} < ${other.update_id})`;
}

export interface SingleCardinalityResolutionTrace {
  winner_update_id: string;
  candidate_update_ids: string[];
  /** Human-readable pairwise decisions (same order as the internal fold). */
  comparisons: string[];
}

/**
 * For single-cardinality update types: among all VALID updates, pick one winner
 * per {@link compareResolvedSingleCardinality}.
 *
 * @see docs/spec/vote-semantics.md
 */
export function resolveSingleCardinality(
  updates: ResolvedUpdate[],
  trace?: (info: SingleCardinalityResolutionTrace) => void,
): ResolvedUpdate[] {
  const valid = updates.filter((u) => u.validity_status === 'VALID');
  if (valid.length === 0) return [];

  if (valid.length === 1) {
    trace?.({
      winner_update_id: valid[0].update_id,
      candidate_update_ids: [valid[0].update_id],
      comparisons: ['single VALID candidate — no comparison'],
    });
    return [valid[0]];
  }

  const comparisons: string[] = [];
  let winner = valid[0];

  for (let i = 1; i < valid.length; i++) {
    const u = valid[i];
    if (compareResolvedSingleCardinality(u, winner) < 0) {
      comparisons.push(`keep ${u.update_id} over ${winner.update_id}: ${explainWhyPreferred(u, winner)}`);
      winner = u;
    } else {
      comparisons.push(`keep ${winner.update_id} over ${u.update_id}: ${explainWhyPreferred(winner, u)}`);
    }
  }

  trace?.({
    winner_update_id: winner.update_id,
    candidate_update_ids: valid.map((x) => x.update_id),
    comparisons,
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
