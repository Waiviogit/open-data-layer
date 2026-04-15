import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Background sync queue for Hive account recovery (get_accounts + social graph).
 * @see docs/apps/chain-indexer/spec/account-sync.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE account_sync_queue (
      account_name    TEXT NOT NULL PRIMARY KEY,
      enqueued_at     BIGINT NOT NULL,
      attempts        INT NOT NULL DEFAULT 0,
      last_attempt_at BIGINT
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_account_sync_queue_pending ON account_sync_queue (last_attempt_at NULLS FIRST)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS account_sync_queue`.execute(db);
}
