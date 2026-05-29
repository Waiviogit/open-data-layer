import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';

/**
 * Human-oriented projection of a {@link ResolvedObjectView} for API / frontend consumption.
 */

/** Compact projected view of an `object_ref` target — same structure as {@link ProjectedObject} but for referenced objects. */
export interface RefSummary {
  object_id: string;
  object_type: string;
  fields: Record<string, unknown>;
  /** From `objects_core.weight` — used for legacy catalog `rank` sort. */
  weight: number | null;
  /** Unix seconds when this ref was added on the parent (`listItem` update `created_at_unix`). */
  addedAtUnix?: number;
  /** Direct `listItem` update count; present only for `object_type === 'list'`. */
  listItemsCount?: number;
  /** True when viewer has administrative authority on this ref target. */
  hasAdministrativeAuthority?: boolean;
}

export interface ProjectedObjectSeo {
  title: string | null;
  description: string | null;
  canonical_url: string | null;
  json_ld: Record<string, unknown>;
  /** Tag values from `tagCategoryItem` updates; null when none. */
  keywords: string[] | null;
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
  update_id: string;
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
  /** Flat Photos-album list for sidebar carousel and description page (legacy `preview_gallery`). */
  previewGallery?: ProjectedGalleryPhoto[];
  /** Grouped gallery albums (legacy `galleryAlbum`). */
  galleryAlbums?: ProjectedGalleryAlbum[];
}

/** One resolved gallery image with vote rank for sort order. */
export interface ProjectedGalleryPhoto {
  url: string;
  rankScore: number | null;
  isAvatar: boolean;
  /** Source `imageGalleryItem` update id (omitted for synthetic avatar row). */
  update_id?: string;
}

export interface ProjectedGalleryAlbum {
  name: string;
  items: ProjectedGalleryPhoto[];
}

export interface ProjectObjectInput {
  view: ResolvedObjectView;
  contentBaseUrl: string | undefined;
  refSummariesById: Map<string, RefSummary>;
  /** Hive account from `X-Viewer` (or similar); used for aggregate rating and authority flags. */
  viewerAccount?: string | null;
  /** From {@link AggregatedObjectRepository.loadByObjectIds}; use {@link emptyRankVoteProjection} when absent. */
  rankVoteProjection: RankVoteProjection;
}
