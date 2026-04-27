import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Site canonical (variant B): objects_core.canonical = https URL;
 * site_registry per creator; dedup queue for event-driven recompute.
 * @see docs/spec/site-canonical.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE site_registry (
      creator                TEXT NOT NULL PRIMARY KEY,
      website_raw            TEXT,
      website_normalized     TEXT,
      effective_canonical    TEXT,
      site_state             TEXT NOT NULL DEFAULT 'fallback'
        CHECK (site_state IN ('active', 'fallback')),
      is_reachable           BOOLEAN NOT NULL DEFAULT FALSE,
      last_checked_at        TIMESTAMPTZ,
      last_success_at        TIMESTAMPTZ,
      last_error             TEXT,
      consecutive_fail_count   INTEGER NOT NULL DEFAULT 0,
      http_status_code       INTEGER,
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_site_registry_site_state ON site_registry (site_state)
  `.execute(db);

  await sql`
    CREATE TABLE canonical_recompute_queue (
      object_id    TEXT NOT NULL PRIMARY KEY
        REFERENCES objects_core (object_id) ON DELETE CASCADE,
      enqueued_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      attempts     INTEGER NOT NULL DEFAULT 0
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_canonical_recompute_enqueued
    ON canonical_recompute_queue (enqueued_at ASC)
  `.execute(db);

  await sql`
    ALTER TABLE objects_core
    ADD COLUMN canonical_creator TEXT
  `.execute(db);

  await sql`
    CREATE INDEX idx_objects_core_canonical
    ON objects_core (canonical)
    WHERE canonical IS NOT NULL
  `.execute(db);

  await sql`
    CREATE INDEX idx_objects_core_canonical_creator
    ON objects_core (canonical_creator)
    WHERE canonical_creator IS NOT NULL
  `.execute(db);

  // Variant B: clear legacy display names (non-https) from canonical
  await sql`
    UPDATE objects_core
    SET canonical = NULL
    WHERE canonical IS NOT NULL
      AND canonical !~* '^https://'
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS canonical_recompute_queue`.execute(db);
  await sql`DROP TABLE IF EXISTS site_registry`.execute(db);
  await sql`ALTER TABLE objects_core DROP COLUMN IF EXISTS canonical_creator`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_canonical`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_canonical_creator`.execute(db);
}
