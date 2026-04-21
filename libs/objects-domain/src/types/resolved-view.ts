import type { JsonValue } from '@opden-data-layer/core';

export type ValidityStatus = 'VALID' | 'REJECTED';

/**
 * A single resolved update value, post-validity and post-ranking resolution.
 */
export interface ResolvedUpdate {
  update_id: string;
  update_type: string;
  creator: string;
  /** BCP 47 tag from object_updates.locale; null = language-neutral. */
  locale: string | null;
  created_at_unix: number;
  event_seq: bigint;
  value_text: string | null;
  /** GeoJSON Point from `value_geo` when `value_kind` is `geo`; otherwise null. */
  value_geo: unknown | null;
  value_json: JsonValue | null;
  validity_status: ValidityStatus;
  /**
   * Signed community vote weight. Null when a decisive admin/trusted vote
   * determined validity (community tier was not evaluated).
   */
  field_weight: number | null;
  /**
   * Decisive rank score (1..10000). Null for single-cardinality update types.
   */
  rank_score: number | null;
  /**
   * Rank context identifier. Null for single-cardinality update types.
   */
  rank_context: string | null;
}

/**
 * All resolved updates for one update_type on one object.
 */
export interface ResolvedField {
  update_type: string;
  cardinality: 'single' | 'multi';
  /**
   * For single-cardinality: at most one entry (the winning VALID update).
   * For multi-cardinality: all VALID entries ordered by ranking.
   * REJECTED entries are included only when include_rejected = true.
   */
  values: ResolvedUpdate[];
}

/**
 * Fully resolved object — the final API-ready representation.
 * @see docs/spec/data-model/flow.md §Step 4
 */
export interface ResolvedObjectView {
  object_id: string;
  object_type: string;
  creator: string;
  weight: number | null;
  meta_group_id: string | null;
  /** Keyed by update_type. Contains only the update_types requested via ResolveOptions.update_types. */
  fields: Record<string, ResolvedField>;
}
