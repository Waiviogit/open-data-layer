import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Object activity dedup: source identity, fingerprints, and cluster roots.
 * @see docs/spec/data-model/messages.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE messages
      ADD COLUMN source_platform TEXT,
      ADD COLUMN source_id       TEXT,
      ADD COLUMN text_simhash    BIGINT,
      ADD COLUMN image_phashes   BIGINT[] NOT NULL DEFAULT '{}',
      ADD COLUMN fingerprint_v   SMALLINT,
      ADD COLUMN dup_group_id    TEXT
  `.execute(db);

  await sql`
    UPDATE messages SET dup_group_id = message_id WHERE dup_group_id IS NULL
  `.execute(db);

  await sql`
    ALTER TABLE messages ALTER COLUMN dup_group_id SET NOT NULL
  `.execute(db);

  await sql`
    ALTER TABLE messages ADD CONSTRAINT chk_messages_source_pair CHECK (
      (source_platform IS NULL) = (source_id IS NULL)
    )
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX uq_messages_source
      ON messages (channel_id, source_platform, source_id)
      WHERE source_platform IS NOT NULL
  `.execute(db);

  await sql`
    CREATE INDEX idx_messages_dedup_window
      ON messages (channel_id, (COALESCE(original_created_at_unix, created_at_unix)) DESC)
      WHERE fingerprint_v IS NOT NULL
  `.execute(db);

  await sql`
    CREATE INDEX idx_messages_dup_group ON messages (dup_group_id)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_messages_dup_group`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_messages_dedup_window`.execute(db);
  await sql`DROP INDEX IF EXISTS uq_messages_source`.execute(db);
  await sql`
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_source_pair
  `.execute(db);
  await sql`
    ALTER TABLE messages
      DROP COLUMN IF EXISTS dup_group_id,
      DROP COLUMN IF EXISTS fingerprint_v,
      DROP COLUMN IF EXISTS image_phashes,
      DROP COLUMN IF EXISTS text_simhash,
      DROP COLUMN IF EXISTS source_id,
      DROP COLUMN IF EXISTS source_platform
  `.execute(db);
}
