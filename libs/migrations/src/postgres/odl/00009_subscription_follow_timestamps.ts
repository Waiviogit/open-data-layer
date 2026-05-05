import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/** When a user followed another user or object; used for social list ordering. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE user_subscriptions
      ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `.execute(db);

  await sql`
    CREATE INDEX idx_user_subscriptions_following_created_at
    ON user_subscriptions (following, created_at DESC)
  `.execute(db);

  await sql`
    CREATE INDEX idx_user_subscriptions_follower_created_at
    ON user_subscriptions (follower, created_at DESC)
  `.execute(db);

  await sql`
    ALTER TABLE user_object_follows
      ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `.execute(db);

  await sql`
    CREATE INDEX idx_user_object_follows_account_created_at
    ON user_object_follows (account, created_at DESC)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_user_object_follows_account_created_at`.execute(
    db,
  );
  await sql`DROP INDEX IF EXISTS idx_user_subscriptions_follower_created_at`.execute(
    db,
  );
  await sql`DROP INDEX IF EXISTS idx_user_subscriptions_following_created_at`.execute(
    db,
  );
  await sql`ALTER TABLE user_object_follows DROP COLUMN IF EXISTS created_at`.execute(
    db,
  );
  await sql`ALTER TABLE user_subscriptions DROP COLUMN IF EXISTS created_at`.execute(
    db,
  );
}
