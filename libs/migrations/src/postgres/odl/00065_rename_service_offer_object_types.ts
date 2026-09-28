import type { Kysely } from 'kysely';
import { sql } from 'kysely';

const RENAMES = [
  ['service_offered', 'service_offer'],
  ['service_requested', 'service_request'],
] as const;

async function rewriteObjectType(
  db: Kysely<unknown>,
  from: string,
  to: string,
): Promise<void> {
  await sql`UPDATE objects_core SET object_type = ${to} WHERE object_type = ${from}`.execute(db);
  await sql`UPDATE post_objects SET object_type = ${to} WHERE object_type = ${from}`.execute(db);
  await sql`
    UPDATE object_tag_category_items SET object_type = ${to} WHERE object_type = ${from}
  `.execute(db);
}

/** Rename stored OBL catalog object types after the registry rename. */
export async function up(db: Kysely<unknown>): Promise<void> {
  for (const [from, to] of RENAMES) {
    await rewriteObjectType(db, from, to);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const [from, to] of RENAMES) {
    await rewriteObjectType(db, to, from);
  }
}
