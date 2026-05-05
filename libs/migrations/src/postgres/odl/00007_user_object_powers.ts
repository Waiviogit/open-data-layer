import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * WAIV voting weight cache for accounts that participate in ODL object/update voting.
 * @see docs/spec/waiv-power.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE user_object_powers (
      account    TEXT   NOT NULL PRIMARY KEY,
      waiv_power DOUBLE PRECISION NOT NULL DEFAULT 0
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS user_object_powers`.execute(db);
}
