import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Deferred reblogs for posts not yet in `posts`.
 * @see docs/apps/chain-indexer/spec/social-parsers.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE post_reblog_pending (
      author             TEXT   NOT NULL,
      permlink           TEXT   NOT NULL,
      account            TEXT   NOT NULL,
      reblogged_at_unix  BIGINT NOT NULL,
      PRIMARY KEY (author, permlink, account)
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_post_reblog_pending_post
    ON post_reblog_pending (author, permlink)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_post_reblog_pending_post`.execute(db);
  await sql`DROP TABLE IF EXISTS post_reblog_pending`.execute(db);
}
