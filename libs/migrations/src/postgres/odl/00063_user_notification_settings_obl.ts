import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * OBL lifecycle notification toggle.
 * @see docs/spec/obl/notifications.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE user_notification_settings
      ADD COLUMN IF NOT EXISTS obl BOOLEAN NOT NULL DEFAULT TRUE
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE user_notification_settings
      DROP COLUMN IF EXISTS obl
  `.execute(db);
}
