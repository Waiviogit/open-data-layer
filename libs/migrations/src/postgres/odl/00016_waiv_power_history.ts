import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Rolling 30-day WAIV power average: raw stake cache + event-sourced history.
 * @see docs/spec/waiv-power.md
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE user_object_powers
      ADD COLUMN raw_waiv_power DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN waiv_power_dirty BOOLEAN NOT NULL DEFAULT FALSE
  `.execute(db);

  await sql`
    UPDATE user_object_powers
    SET raw_waiv_power = waiv_power
  `.execute(db);

  await sql`
    CREATE TABLE user_waiv_power_history (
      id          BIGSERIAL PRIMARY KEY,
      account     TEXT NOT NULL,
      waiv_power  DOUBLE PRECISION NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_uwph_account_recorded_at
    ON user_waiv_power_history (account, recorded_at DESC)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_uwph_account_recorded_at`.execute(db);
  await sql`DROP TABLE IF EXISTS user_waiv_power_history`.execute(db);
  await sql`
    ALTER TABLE user_object_powers
      DROP COLUMN IF EXISTS waiv_power_dirty,
      DROP COLUMN IF EXISTS raw_waiv_power
  `.execute(db);
}
