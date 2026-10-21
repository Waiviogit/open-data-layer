import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Drop already-migrated affiliateCode rows whose first JSON element is not
 * PERSONAL or GOVERNANCE (legacy site-domain scopes).
 * validity_votes / rank_votes cascade via ON DELETE CASCADE.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    DELETE FROM object_updates
    WHERE update_type = 'affiliateCode'
      AND (
        jsonb_typeof(value_json) <> 'array'
        OR value_json->>0 NOT IN ('PERSONAL', 'GOVERNANCE')
      )
  `.execute(db);
}

/** Irreversible — restore via a mongo-objects reimport. */
export async function down(_db: Kysely<unknown>): Promise<void> {
  return;
}
