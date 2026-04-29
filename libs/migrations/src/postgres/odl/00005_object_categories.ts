import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Per-object resolved categories and per-scope aggregated related names for shop navigation.
 * @see docs/apps/chain-indexer/spec/object-categories.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE object_categories (
      object_id TEXT NOT NULL PRIMARY KEY
        REFERENCES objects_core (object_id) ON DELETE CASCADE,
      meta_group_id TEXT NULL,
      category_names TEXT[] NOT NULL DEFAULT '{}',
      updated_at_seq BIGINT NOT NULL
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_object_categories_meta_group_id
    ON object_categories (meta_group_id)
  `.execute(db);

  await sql`
    CREATE INDEX idx_object_categories_category_names_gin
    ON object_categories USING gin (category_names)
  `.execute(db);

  await sql`
    CREATE TABLE object_categories_sync_queue (
      object_id TEXT NOT NULL PRIMARY KEY,
      enqueued_at BIGINT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at BIGINT NULL
    )
  `.execute(db);

  await sql`
    CREATE TABLE object_categories_related (
      scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'user')),
      scope_key TEXT NOT NULL,
      category_name TEXT NOT NULL,
      objects_count BIGINT NOT NULL,
      group_keys TEXT[] NOT NULL DEFAULT '{}'::text[],
      related_names TEXT[] NOT NULL DEFAULT '{}'::text[],
      PRIMARY KEY (scope_type, scope_key, category_name)
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_object_categories_related_scope_count
    ON object_categories_related (scope_type, scope_key, objects_count DESC)
  `.execute(db);

  await sql`
    CREATE TABLE object_categories_related_sync_queue (
      scope_type TEXT NOT NULL,
      scope_key TEXT NOT NULL,
      enqueued_at BIGINT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at BIGINT NULL,
      PRIMARY KEY (scope_type, scope_key)
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS object_categories_related_sync_queue`.execute(db);
  await sql`DROP TABLE IF EXISTS object_categories_related`.execute(db);
  await sql`DROP TABLE IF EXISTS object_categories_sync_queue`.execute(db);
  await sql`DROP TABLE IF EXISTS object_categories`.execute(db);
}
