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

/** `aggregateRating` field: community average plus the current viewer's vote (if any). */
export interface ProjectedAggregateRating {
  /** Rounded mean of `rank_score` across valid rating rows (1–10000 scale); null if none. */
  averageRating: number | null;
  /** `value_text` for the row whose `creator` matches the viewer; null if anonymous or no vote. */
  userRating: string | null;
}

export interface ProjectedObject {
  object_id: string;
  object_type: string;
  semantic_type: string | null;
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
}
