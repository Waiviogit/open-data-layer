import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Background sync queue for Hive vote rshares and ghost posts.
 * @see docs/apps/chain-indexer/spec/vote-ingestion.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE post_sync_queue (
      author            TEXT NOT NULL,
      permlink          TEXT NOT NULL,
      enqueued_at       BIGINT NOT NULL,
      needs_post_create BOOLEAN NOT NULL DEFAULT FALSE,
      attempts          INT NOT NULL DEFAULT 0,
      last_attempt_at   BIGINT,
      PRIMARY KEY (author, permlink)
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_post_sync_queue_pending ON post_sync_queue (last_attempt_at NULLS FIRST)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS post_sync_queue`.execute(db);
}
