import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/** Drops legacy `tagged` on post_objects; see docs/spec/data-model/post-json-metadata-objects.md */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE post_objects DROP COLUMN IF EXISTS tagged`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE post_objects ADD COLUMN tagged TEXT`.execute(db);
}
