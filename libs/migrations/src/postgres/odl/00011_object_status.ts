import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/** Object lifecycle status; default `active`. Query-api only exposes `active` rows. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE objects_core
      ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'relisted', 'unavailable', 'nsfw', 'flagged'))
  `.execute(db);

  await sql`
    CREATE INDEX idx_objects_core_status ON objects_core (status)
    WHERE status <> 'active'
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_objects_core_status`.execute(db);
  await sql`ALTER TABLE objects_core DROP COLUMN status`.execute(db);
}
