import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Persist computed rank metadata on updates (see indexer RankScoreService).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE object_updates
      ADD COLUMN rank_score INT NULL,
      ADD COLUMN rank_context TEXT NULL,
      ADD COLUMN rank_decisive_event_seq BIGINT NULL
  `.execute(db);

  await sql`
    CREATE INDEX idx_object_updates_object_rank_score
    ON object_updates (object_id, rank_score)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_object_updates_object_rank_score`.execute(db);
  await sql`
    ALTER TABLE object_updates
      DROP COLUMN IF EXISTS rank_decisive_event_seq,
      DROP COLUMN IF EXISTS rank_context,
      DROP COLUMN IF EXISTS rank_score
  `.execute(db);
}
