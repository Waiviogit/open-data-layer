/**
 * Slim core object row. Table: objects_core.
 *
 * No embedded arrays. All updates and votes live in separate tables.
 * seq is incremented on every mutation; used for change tracking.
 */

export interface ObjectCoreRow {
  object_id: string;
  object_type: string;
  creator: string;
  weight: number | null;
  meta_group_id: string | null;
  /**
   * Normalized site URL for this object (variant B): `https://...` only.
   * Populated by the site-canonical pipeline; see `docs/spec/site-canonical.md`.
   */
  canonical: string | null;
  /** Hive account of the winning `description` update author (`en-US`); used with `site_registry` bulk updates. */
  canonical_creator: string | null;
  seq: number;
}
