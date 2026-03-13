/**
 * One row per update. Table: object_updates.
 *
 * CanonicalPosition inlined via CanonicalPositionColumns. Exactly one of
 * value_text, value_geo, value_json is set (enforced by DB CHECK).
 * search_vector and value_text_normalized are generated/trigger-maintained columns.
 *
 * Cardinality and value_kind are properties of the update_type definition
 * in the application-level update registry, not stored per row.
 */

import type { CanonicalPositionColumns } from './shared-types';

export interface ObjectUpdateRow extends CanonicalPositionColumns {
  update_id: string;
  object_id: string;
  update_type: string;
  creator: string;
  /** BCP 47 language-REGION tag, e.g. "en-US", "fr-FR". Null means language-neutral. */
  locale: string | null;
  created_at_unix: number;
  value_text: string | null;
  /**
   * PostGIS geography(Point, 4326).
   * On INSERT: use ST_MakePoint(lon, lat)::geography
   * On SELECT: driver returns WKB binary unless you cast via ST_AsGeoJSON()
   */
  value_geo: unknown;
  value_json: unknown;
  /** Generated column: LOWER(TRIM(value_text)). Use for case-insensitive exact match. */
  value_text_normalized: string | null;
  /** tsvector, auto-populated by trigger from value_text */
  search_vector: unknown;
}
