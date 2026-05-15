import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/** Object authority edge ordering (recency lists). */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE object_authority
      ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `.execute(db);

  await sql`
    CREATE INDEX idx_object_authority_object_id_type_created_at
    ON object_authority (object_id, authority_type, created_at DESC)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_object_authority_object_id_type_created_at`.execute(db);
  await sql`ALTER TABLE object_authority DROP COLUMN IF EXISTS created_at`.execute(db);
}
