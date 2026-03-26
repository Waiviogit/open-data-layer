import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Initial ODL schema: objects_core, object_updates, validity_votes, rank_votes, object_authority, accounts_current.
 * Source: spec/postgres-concept/schema.sql. Types: @opden-data-layer/core (OdlDatabase).
 * Requires: PostGIS extension.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS postgis`.execute(db);

  await sql`
    CREATE TABLE objects_core (
      object_id   TEXT NOT NULL PRIMARY KEY,
      object_type TEXT NOT NULL,
      creator     TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      weight      DOUBLE PRECISION,
      meta_group_id TEXT,
      canonical   TEXT,
      seq         BIGINT NOT NULL DEFAULT 0
    )
  `.execute(db);

  await sql`CREATE INDEX idx_objects_core_object_type_weight ON objects_core (object_type, weight DESC NULLS LAST)`.execute(db);
  await sql`CREATE INDEX idx_objects_core_creator ON objects_core (creator)`.execute(db);

  await sql`
    CREATE TABLE object_updates (
      update_id       TEXT NOT NULL PRIMARY KEY,
      object_id       TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
      update_type     TEXT NOT NULL,
      creator         TEXT NOT NULL,
      locale          TEXT,
      created_at_unix BIGINT NOT NULL,
      event_seq       BIGINT NOT NULL,
      transaction_id  TEXT NOT NULL,
      value_text      TEXT,
      value_geo       GEOGRAPHY(Point, 4326),
      value_json      JSONB,
      value_text_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(value_text))) STORED,
      search_vector   TSVECTOR,
      CONSTRAINT chk_exactly_one_value CHECK (
        (value_text IS NOT NULL)::int + (value_geo IS NOT NULL)::int + (value_json IS NOT NULL)::int = 1
      )
    )
  `.execute(db);

  await sql`CREATE INDEX idx_object_updates_object_id_update_type ON object_updates (object_id, update_type)`.execute(db);
  await sql`CREATE INDEX idx_object_updates_search_vector ON object_updates USING GIN (search_vector)`.execute(db);
  await sql`CREATE INDEX idx_object_updates_value_geo ON object_updates USING GIST (value_geo)`.execute(db);
  await sql`CREATE INDEX idx_object_updates_update_type_value_text ON object_updates (update_type, value_text) WHERE value_text IS NOT NULL`.execute(db);
  await sql`CREATE INDEX idx_object_updates_update_type_value_text_normalized ON object_updates (update_type, value_text_normalized) WHERE value_text_normalized IS NOT NULL`.execute(db);

  await sql`
    CREATE OR REPLACE FUNCTION object_updates_search_vector_trigger()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.value_text IS NOT NULL THEN
        NEW.search_vector := to_tsvector('english', NEW.value_text);
      ELSE
        NEW.search_vector := NULL;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db);

  await sql`
    CREATE TRIGGER tr_object_updates_search_vector
      BEFORE INSERT OR UPDATE OF value_text ON object_updates
      FOR EACH ROW
      EXECUTE PROCEDURE object_updates_search_vector_trigger()
  `.execute(db);

  await sql`
    CREATE TABLE validity_votes (
      update_id      TEXT NOT NULL REFERENCES object_updates (update_id) ON DELETE CASCADE,
      object_id      TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
      voter          TEXT NOT NULL,
      vote           TEXT NOT NULL CHECK (vote IN ('for', 'against')),
      event_seq      BIGINT NOT NULL,
      transaction_id TEXT NOT NULL,
      PRIMARY KEY (update_id, voter)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_validity_votes_object_id ON validity_votes (object_id)`.execute(db);

  await sql`
    CREATE TABLE rank_votes (
      update_id      TEXT NOT NULL REFERENCES object_updates (update_id) ON DELETE CASCADE,
      object_id      TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
      voter          TEXT NOT NULL,
      rank           INT NOT NULL CHECK (rank >= 1 AND rank <= 10000),
      rank_context   TEXT NOT NULL,
      event_seq      BIGINT NOT NULL,
      transaction_id TEXT NOT NULL,
      PRIMARY KEY (update_id, voter, rank_context)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_rank_votes_object_id ON rank_votes (object_id)`.execute(db);

  await sql`
    CREATE TABLE object_authority (
      object_id       TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
      account         TEXT NOT NULL,
      authority_type  TEXT NOT NULL CHECK (authority_type IN ('ownership', 'administrative')),
      PRIMARY KEY (object_id, account, authority_type)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_object_authority_object_id_authority_type ON object_authority (object_id, authority_type)`.execute(db);
  await sql`CREATE INDEX idx_object_authority_account ON object_authority (account)`.execute(db);

  await sql`
    CREATE TABLE accounts_current (
      name                   TEXT NOT NULL PRIMARY KEY,
      hive_id                INT,
      json_metadata          TEXT,
      posting_json_metadata  TEXT,
      created                TEXT,
      comment_count          INT NOT NULL DEFAULT 0,
      lifetime_vote_count    INT NOT NULL DEFAULT 0,
      post_count             INT NOT NULL DEFAULT 0,
      last_post              TEXT,
      last_root_post         TEXT,
      object_reputation      INT NOT NULL DEFAULT 0,
      updated_at_unix        BIGINT
    )
  `.execute(db);

  await sql`CREATE INDEX idx_accounts_current_object_reputation ON accounts_current (object_reputation DESC NULLS LAST)`.execute(db);
  await sql`CREATE INDEX idx_accounts_current_hive_id ON accounts_current (hive_id) WHERE hive_id IS NOT NULL`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS tr_object_updates_search_vector ON object_updates`.execute(db);
  await sql`DROP FUNCTION IF EXISTS object_updates_search_vector_trigger()`.execute(db);
  await sql`DROP TABLE IF EXISTS object_authority`.execute(db);
  await sql`DROP TABLE IF EXISTS rank_votes`.execute(db);
  await sql`DROP TABLE IF EXISTS validity_votes`.execute(db);
  await sql`DROP TABLE IF EXISTS object_updates`.execute(db);
  await sql`DROP TABLE IF EXISTS objects_core`.execute(db);
  await sql`DROP TABLE IF EXISTS accounts_current`.execute(db);
}
