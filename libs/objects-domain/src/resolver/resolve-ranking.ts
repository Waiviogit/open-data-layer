import type { RankVote } from '@opden-data-layer/core';
import type { GovernanceSnapshot } from '../types/governance-snapshot';
import type { ResolvedUpdate } from '../types/resolved-view';

/**
 * Resolve the decisive rank_score for a single update within a rank_context.
 *
 * Hierarchy (mirrors validity tier order, rank channel only):
 *   1. Latest admin rank wins (LWAW) — highest event_seq among admin voters
 *   2. Latest trusted rank wins (LWTW) — highest event_seq among trusted voters
 *   3. No decisive rank → rank_score = null
 *
 * @see docs/spec/vote-semantics.md §B
 */
function resolveDecisiveRankScore(
  rankVotes: RankVote[],
  governance: GovernanceSnapshot,
): { rank_score: number | null; rank_context: string | null } {
  if (rankVotes.length === 0) {
    return { rank_score: null, rank_context: null };
  }

  const adminVotes = rankVotes.filter((v) => governance.admins.includes(v.voter));
  if (adminVotes.length > 0) {
    const latest = latestRankVote(adminVotes);
    return { rank_score: latest.rank, rank_context: latest.rank_context };
  }

  const trustedVotes = rankVotes.filter((v) => governance.trusted.includes(v.voter));
  if (trustedVotes.length > 0) {
    const latest = latestRankVote(trustedVotes);
    return { rank_score: latest.rank, rank_context: latest.rank_context };
  }

  return { rank_score: null, rank_context: null };
}

/**
 * Sort resolved VALID updates by decisive rank_score.
 *
 * Tie-break order (per spec vote-semantics.md §B):
 *   1. rank_score ASC (lower = higher rank)
 *   2. latest decisive rank vote event_seq DESC
 *   3. latest update event_seq DESC
 *   4. update_id ASC
 */
export function resolveRanking(
  updates: ResolvedUpdate[],
  rankVotes: RankVote[],
  governance: GovernanceSnapshot,
): ResolvedUpdate[] {
  const withScores = updates.map((u) => {
    const votesForUpdate = rankVotes.filter((v) => v.update_id === u.update_id);
    const { rank_score, rank_context } = resolveDecisiveRankScore(votesForUpdate, governance);

    const latestDecisiveSeq = getLatestDecisiveRankSeq(votesForUpdate, governance);

    return { update: { ...u, rank_score, rank_context }, latestDecisiveSeq };
  });

  return withScores
    .sort((a, b) => compareRanked(a, b))
    .map((entry) => entry.update);
}

function compareRanked(
  a: { update: ResolvedUpdate; latestDecisiveSeq: bigint | null },
  b: { update: ResolvedUpdate; latestDecisiveSeq: bigint | null },
): number {
  const aScore = a.update.rank_score;
  const bScore = b.update.rank_score;

  // Unranked updates go to the end
  if (aScore !== null && bScore === null) return -1;
  if (aScore === null && bScore !== null) return 1;
  if (aScore !== null && bScore !== null && aScore !== bScore) return aScore - bScore;

  // Tie-break 2: latest decisive rank vote event_seq DESC
  const aSeq = a.latestDecisiveSeq;
  const bSeq = b.latestDecisiveSeq;
  if (aSeq !== null && bSeq === null) return -1;
  if (aSeq === null && bSeq !== null) return 1;
  if (aSeq !== null && bSeq !== null && aSeq !== bSeq) {
    return aSeq > bSeq ? -1 : 1;
  }

  // Tie-break 3: latest update event_seq DESC
  if (a.update.event_seq !== b.update.event_seq) {
    return a.update.event_seq > b.update.event_seq ? -1 : 1;
  }

  // Tie-break 4: update_id ASC
  return a.update.update_id < b.update.update_id ? -1 : 1;
}

function getLatestDecisiveRankSeq(
  rankVotes: RankVote[],
  governance: GovernanceSnapshot,
): bigint | null {
  const adminVotes = rankVotes.filter((v) => governance.admins.includes(v.voter));
  if (adminVotes.length > 0) {
    return latestRankVote(adminVotes).event_seq;
  }
  const trustedVotes = rankVotes.filter((v) => governance.trusted.includes(v.voter));
  if (trustedVotes.length > 0) {
    return latestRankVote(trustedVotes).event_seq;
  }
  return null;
}

function latestRankVote(votes: RankVote[]): RankVote {
  return votes.reduce((best, v) => (v.event_seq > best.event_seq ? v : best));
}
