import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Allow rank 0 in rank_votes (ODL 0..10000; legacy Mongo rating used 0..10 mapped ×1000).
 * Replaces column CHECK from 1..10000.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE rank_votes DROP CONSTRAINT IF EXISTS rank_votes_rank_check`.execute(
    db,
  );
  await sql`
    ALTER TABLE rank_votes
    ADD CONSTRAINT rank_votes_rank_check CHECK (rank >= 0 AND rank <= 10000)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE rank_votes DROP CONSTRAINT IF EXISTS rank_votes_rank_check`.execute(
    db,
  );
  await sql`
    ALTER TABLE rank_votes
    ADD CONSTRAINT rank_votes_rank_check CHECK (rank >= 1 AND rank <= 10000)
  `.execute(db);
}
