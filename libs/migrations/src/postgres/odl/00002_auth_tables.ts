import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Auth tables for auth-api: challenges, identities, refresh sessions.
 * Types: apps/auth-api/src/database/types.ts
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE auth_challenges (
      id UUID PRIMARY KEY,
      provider TEXT NOT NULL,
      hive_username TEXT NOT NULL,
      nonce TEXT NOT NULL,
      message TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      ip TEXT,
      user_agent TEXT,
      metadata_json JSONB
    )
  `.execute(db);

  await sql`CREATE INDEX idx_auth_challenges_expires_at ON auth_challenges (expires_at)`.execute(db);
  await sql`CREATE INDEX idx_auth_challenges_hive_username ON auth_challenges (hive_username)`.execute(db);

  await sql`
    CREATE TABLE auth_identities (
      id UUID PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata_json JSONB,
      UNIQUE (provider, provider_subject)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_auth_identities_user_id ON auth_identities (user_id)`.execute(db);

  await sql`
    CREATE TABLE refresh_sessions (
      id UUID PRIMARY KEY,
      user_id TEXT NOT NULL,
      auth_provider TEXT NOT NULL DEFAULT 'keychain',
      refresh_token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      device_info TEXT,
      ip TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`CREATE INDEX idx_refresh_sessions_user_id ON refresh_sessions (user_id)`.execute(db);
  await sql`CREATE INDEX idx_refresh_sessions_refresh_token_hash ON refresh_sessions (refresh_token_hash)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS refresh_sessions`.execute(db);
  await sql`DROP TABLE IF EXISTS auth_identities`.execute(db);
  await sql`DROP TABLE IF EXISTS auth_challenges`.execute(db);
}
