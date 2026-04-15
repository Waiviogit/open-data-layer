import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Hive social mute pairs (ignore) — pair-level only, no app lists.
 * @see docs/spec/social-account-ingestion.md (logical: social_mutes_current)
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE user_account_mutes (
      muter   TEXT NOT NULL,
      muted   TEXT NOT NULL,
      PRIMARY KEY (muter, muted)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_user_account_mutes_muted ON user_account_mutes (muted)`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS user_account_mutes`.execute(db);
}
