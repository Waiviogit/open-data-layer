import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Per-channel object-activity sort for the followed-objects message feed.
 * `idx_messages_channel_time` orders by chain `created_at_unix`; the feed orders by
 * `COALESCE(original_created_at_unix, created_at_unix)`.
 * @see docs/spec/data-model/messages.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE INDEX idx_messages_channel_activity_time
      ON messages (
        channel_id,
        (COALESCE(original_created_at_unix, created_at_unix)) DESC,
        event_seq DESC
      )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_messages_channel_activity_time`.execute(db);
}
