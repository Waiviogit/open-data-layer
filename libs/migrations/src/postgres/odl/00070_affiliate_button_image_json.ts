import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Rewrite legacy affiliateButton `value_text` URLs as imageCidOrUrl `{ url }`.
 * Existing `value_json` rows (including `{ cid }`) are left alone. Never sniffs a CID.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    UPDATE object_updates
    SET value_json = jsonb_build_object('url', trim(value_text)),
        value_text = NULL
    WHERE update_type = 'affiliateButton'
      AND value_text IS NOT NULL
      AND trim(value_text) <> ''
      AND value_json IS NULL
  `.execute(db);
}

/** Reverse only `{ url }` back to `value_text`. `{ cid }` rows stay JSON. */
export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    UPDATE object_updates
    SET value_text = trim(value_json->>'url'),
        value_json = NULL
    WHERE update_type = 'affiliateButton'
      AND value_json IS NOT NULL
      AND value_json ? 'url'
      AND jsonb_typeof(value_json->'url') = 'string'
      AND trim(value_json->>'url') <> ''
  `.execute(db);
}
