import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Shop visibility flags on user_metadata; per-user deselect for post-linked objects only.
 * @see docs/apps/chain-indexer/spec/object-categories.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE user_metadata
      ADD COLUMN IF NOT EXISTS hide_linked_objects BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS hide_recipe_objects BOOLEAN NOT NULL DEFAULT FALSE
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS user_shop_deselect (
      account TEXT NOT NULL,
      object_id TEXT NOT NULL,
      PRIMARY KEY (account, object_id)
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_user_shop_deselect_account
    ON user_shop_deselect (account)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS user_shop_deselect`.execute(db);
  await sql`
    ALTER TABLE user_metadata
      DROP COLUMN IF EXISTS hide_recipe_objects,
      DROP COLUMN IF EXISTS hide_linked_objects
  `.execute(db);
}
