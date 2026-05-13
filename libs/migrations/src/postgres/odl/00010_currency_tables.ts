import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/** FX fiat rates + CoinGecko Hive/HBD + Hive Engine WAIV rates (migration from Mongo currency-service). */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE currency_rates (
      id         BIGSERIAL PRIMARY KEY,
      base       TEXT NOT NULL DEFAULT 'USD',
      date       DATE NOT NULL,
      cad        NUMERIC(18, 8) NOT NULL,
      eur        NUMERIC(18, 8) NOT NULL,
      aud        NUMERIC(18, 8) NOT NULL,
      mxn        NUMERIC(18, 8) NOT NULL,
      gbp        NUMERIC(18, 8) NOT NULL,
      jpy        NUMERIC(18, 8) NOT NULL,
      cny        NUMERIC(18, 8) NOT NULL,
      rub        NUMERIC(18, 8) NOT NULL,
      uah        NUMERIC(18, 8) NOT NULL,
      chf        NUMERIC(18, 8) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX idx_currency_rates_base_date ON currency_rates (base, date)
  `.execute(db);

  await sql`
    CREATE TABLE currency_statistics (
      id BIGSERIAL PRIMARY KEY,
      is_daily BOOLEAN NOT NULL DEFAULT false,
      hive_usd NUMERIC(18, 8) NOT NULL,
      hive_usd_24h_change NUMERIC(18, 8) NOT NULL,
      hive_btc NUMERIC(24, 12) NOT NULL,
      hive_btc_24h_change NUMERIC(18, 8) NOT NULL,
      hbd_usd NUMERIC(18, 8) NOT NULL,
      hbd_usd_24h_change NUMERIC(18, 8) NOT NULL,
      hbd_btc NUMERIC(24, 12) NOT NULL,
      hbd_btc_24h_change NUMERIC(18, 8) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_currency_statistics_is_daily_created_at
    ON currency_statistics (is_daily, created_at DESC)
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX idx_currency_statistics_daily_date
    ON currency_statistics (
      ((created_at AT TIME ZONE 'UTC')::date)
    )
    WHERE is_daily = true
  `.execute(db);

  await sql`
    CREATE TABLE hive_engine_rates (
      id BIGSERIAL PRIMARY KEY,
      base TEXT NOT NULL DEFAULT 'WAIV',
      is_daily BOOLEAN NOT NULL DEFAULT false,
      date DATE NOT NULL,
      rate_hive NUMERIC(18, 8) NOT NULL,
      rate_usd NUMERIC(18, 8) NOT NULL,
      change_24h_hive NUMERIC(18, 8),
      change_24h_usd NUMERIC(18, 8),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_hive_engine_rates_base_daily_date
    ON hive_engine_rates (base, is_daily, date DESC)
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX idx_hive_engine_rates_daily_unique
    ON hive_engine_rates (base, date)
    WHERE is_daily = true
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_hive_engine_rates_daily_unique`.execute(
    db,
  );
  await sql`DROP INDEX IF EXISTS idx_hive_engine_rates_base_daily_date`.execute(
    db,
  );
  await sql`DROP TABLE IF EXISTS hive_engine_rates`.execute(db);

  await sql`DROP INDEX IF EXISTS idx_currency_statistics_daily_date`.execute(
    db,
  );
  await sql`DROP INDEX IF EXISTS idx_currency_statistics_is_daily_created_at`.execute(
    db,
  );
  await sql`DROP TABLE IF EXISTS currency_statistics`.execute(db);

  await sql`DROP INDEX IF EXISTS idx_currency_rates_base_date`.execute(db);
  await sql`DROP TABLE IF EXISTS currency_rates`.execute(db);
}
