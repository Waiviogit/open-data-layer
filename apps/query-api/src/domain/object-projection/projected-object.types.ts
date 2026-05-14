import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';

/**
 * Human-oriented projection of a {@link ResolvedObjectView} for API / frontend consumption.
 */

/** Compact projected view of an `object_ref` target — same structure as {@link ProjectedObject} but for referenced objects. */
export interface RefSummary {
  object_id: string;
  object_type: string;
  fields: Record<string, unknown>;
}

export interface ProjectedObjectSeo {
  title: string | null;
  description: string | null;
  canonical_url: string | null;
  json_ld: Record<string, unknown>;
}

/**
 * Rows from `rank_votes`: vote counts per `update_id`, and viewer’s latest rank per aspect (`update_id`)
 * keyed for `aggregateRating` projection.
 */
export interface RankVoteProjection {
  readonly countByUpdateId: ReadonlyMap<string, number>;
  readonly viewerRankByUpdateId: ReadonlyMap<string, number>;
}

export function emptyRankVoteProjection(): RankVoteProjection {
  return {
    countByUpdateId: new Map(),
    viewerRankByUpdateId: new Map(),
  };
}

/** One `aggregateRating` aspect; `fields.aggregateRating` is an array of these (0-length if none). */
export interface ProjectedAggregateRatingRow {
  dimension: string;
  averageRating: number | null;
  /** Viewer’s ODL rank (0–10000) when `rank_votes` has a vote for `(update_id, viewer)` with latest `event_seq`. */
  userRating: number | null;
  /** `COUNT(rank_votes)` for this `update_id`. */
  totalVoters: number;
}

export interface ProjectedObject {
  object_id: string;
  object_type: string;
  semantic_type: string | null;
  /** From `objects_core.weight`. */
  weight: number | null;
  fields: Record<string, unknown>;
  /** True when `viewerAccount` has an `administrative` row for this object. */
  hasAdministrativeAuthority: boolean;
  /** True when `viewerAccount` has an `ownership` row for this object. */
  hasOwnershipAuthority: boolean;
  seo?: ProjectedObjectSeo;
}

export interface ProjectObjectInput {
  view: ResolvedObjectView;
  ipfsGatewayBaseUrl: string;
  refSummariesById: Map<string, RefSummary>;
  /** Hive account from `X-Viewer` (or similar); used for aggregate rating and authority flags. */
  viewerAccount?: string | null;
  /** From {@link AggregatedObjectRepository.loadByObjectIds}; use {@link emptyRankVoteProjection} when absent. */
  rankVoteProjection: RankVoteProjection;
}
