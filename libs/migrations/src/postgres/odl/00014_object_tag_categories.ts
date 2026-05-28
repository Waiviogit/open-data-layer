import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Materialized valid tagCategoryItem rows for discover facets (governance-resolved).
 * @see docs/apps/chain-indexer/spec/object-tag-categories.md (when added)
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE object_tag_category_items (
      object_id TEXT NOT NULL
        REFERENCES objects_core (object_id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (object_id, category, value)
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_object_tag_category_items_cat_val
    ON object_tag_category_items (category, value)
  `.execute(db);

  await sql`
    CREATE INDEX idx_object_tag_category_items_object_id
    ON object_tag_category_items (object_id)
  `.execute(db);

  await sql`
    CREATE TABLE object_tag_categories_sync_queue (
      object_id TEXT NOT NULL PRIMARY KEY
        REFERENCES objects_core (object_id) ON DELETE CASCADE,
      enqueued_at BIGINT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at BIGINT NULL
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS object_tag_categories_sync_queue`.execute(db);
  await sql`DROP TABLE IF EXISTS object_tag_category_items`.execute(db);
}
