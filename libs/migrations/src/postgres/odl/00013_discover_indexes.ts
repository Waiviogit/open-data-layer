import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Indexes for /discover: tagCategoryItem AND filters and object_type browse by seq.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE INDEX idx_object_updates_tagitem_value
    ON object_updates ((value_json->>'value'), (value_json->>'category'))
    WHERE update_type = 'tagCategoryItem'
  `.execute(db);

  await sql`
    CREATE INDEX idx_objects_core_type_seq
    ON objects_core (object_type, seq DESC)
    WHERE status = 'active'
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_objects_core_type_seq`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_tagitem_value`.execute(db);
}
