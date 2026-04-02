import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Initial ODL schema: objects_core, object_updates, validity_votes, rank_votes, object_authority, accounts_current,
 * user_* tables, posts and post_* satellite tables.
 * Source: docs/spec/data-model/schema.sql. Types: @opden-data-layer/core (OdlDatabase).
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
  await sql`CREATE INDEX idx_object_updates_update_type_value_text ON object_updates (update_type, LEFT(value_text, 2048)) WHERE value_text IS NOT NULL`.execute(db);
  await sql`CREATE INDEX idx_object_updates_update_type_value_text_normalized ON object_updates (update_type, LEFT(value_text_normalized, 2048)) WHERE value_text_normalized IS NOT NULL`.execute(db);

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
      updated_at_unix        BIGINT,
      alias                  TEXT,
      profile_image          TEXT,
      wobjects_weight        DOUBLE PRECISION NOT NULL DEFAULT 0,
      last_posts_count       INT NOT NULL DEFAULT 0,
      users_following_count  INT NOT NULL DEFAULT 0,
      followers_count        INT NOT NULL DEFAULT 0,
      stage_version          INT NOT NULL DEFAULT 0,
      referral_status        TEXT,
      last_activity          BIGINT
    )
  `.execute(db);

  await sql`CREATE INDEX idx_accounts_current_object_reputation ON accounts_current (object_reputation DESC NULLS LAST)`.execute(db);
  await sql`CREATE INDEX idx_accounts_current_hive_id ON accounts_current (hive_id) WHERE hive_id IS NOT NULL`.execute(db);

  await sql`
    CREATE TABLE user_metadata (
      account                        TEXT NOT NULL PRIMARY KEY REFERENCES accounts_current (name) ON DELETE CASCADE,
      notifications_last_timestamp   BIGINT NOT NULL DEFAULT 0,
      exit_page_setting              BOOLEAN NOT NULL DEFAULT TRUE,
      locale                         TEXT NOT NULL DEFAULT 'en-US',
      post_locales                   JSONB NOT NULL DEFAULT '[]'::jsonb,
      nightmode                      BOOLEAN NOT NULL DEFAULT FALSE,
      reward_setting                 TEXT NOT NULL DEFAULT '50' CHECK (reward_setting IN ('HP', '50', 'HIVE')),
      rewrite_links                  BOOLEAN NOT NULL DEFAULT FALSE,
      show_nsfw_posts                BOOLEAN NOT NULL DEFAULT FALSE,
      upvote_setting                 BOOLEAN NOT NULL DEFAULT FALSE,
      vote_percent                   INT NOT NULL DEFAULT 5000,
      voting_power                   BOOLEAN NOT NULL DEFAULT TRUE,
      currency                       TEXT
    )
  `.execute(db);

  await sql`
    CREATE TABLE user_notification_settings (
      account                TEXT NOT NULL PRIMARY KEY REFERENCES accounts_current (name) ON DELETE CASCADE,
      activation_campaign    BOOLEAN NOT NULL DEFAULT TRUE,
      deactivation_campaign  BOOLEAN NOT NULL DEFAULT TRUE,
      follow                 BOOLEAN NOT NULL DEFAULT TRUE,
      fill_order             BOOLEAN NOT NULL DEFAULT TRUE,
      mention                BOOLEAN NOT NULL DEFAULT TRUE,
      minimal_transfer       DOUBLE PRECISION NOT NULL DEFAULT 0,
      reblog                 BOOLEAN NOT NULL DEFAULT TRUE,
      reply                  BOOLEAN NOT NULL DEFAULT TRUE,
      status_change          BOOLEAN NOT NULL DEFAULT TRUE,
      transfer               BOOLEAN NOT NULL DEFAULT TRUE,
      power_up               BOOLEAN NOT NULL DEFAULT TRUE,
      witness_vote           BOOLEAN NOT NULL DEFAULT TRUE,
      my_post                BOOLEAN NOT NULL DEFAULT FALSE,
      my_comment             BOOLEAN NOT NULL DEFAULT FALSE,
      my_like                BOOLEAN NOT NULL DEFAULT FALSE,
      vote                   BOOLEAN NOT NULL DEFAULT TRUE,
      downvote               BOOLEAN NOT NULL DEFAULT FALSE,
      claim_reward           BOOLEAN NOT NULL DEFAULT FALSE
    )
  `.execute(db);

  await sql`
    CREATE TABLE user_referrals (
      account      TEXT NOT NULL REFERENCES accounts_current (name) ON DELETE CASCADE,
      agent        TEXT NOT NULL,
      type         TEXT NOT NULL,
      started_at   BIGINT,
      ended_at     BIGINT,
      PRIMARY KEY (account, agent, type)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_user_referrals_agent ON user_referrals (agent)`.execute(db);

  await sql`
    CREATE TABLE user_post_bookmarks (
      account   TEXT NOT NULL REFERENCES accounts_current (name) ON DELETE CASCADE,
      author    TEXT NOT NULL,
      permlink  TEXT NOT NULL,
      PRIMARY KEY (account, author, permlink)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_user_post_bookmarks_account ON user_post_bookmarks (account)`.execute(db);

  await sql`
    CREATE TABLE user_subscriptions (
      follower   TEXT NOT NULL,
      following  TEXT NOT NULL,
      bell       BOOLEAN,
      PRIMARY KEY (follower, following)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_user_subscriptions_following ON user_subscriptions (following)`.execute(db);

  await sql`
    CREATE TABLE user_object_follows (
      account    TEXT NOT NULL REFERENCES accounts_current (name) ON DELETE CASCADE,
      object_id  TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
      bell       BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (account, object_id)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_user_object_follows_object_id ON user_object_follows (object_id)`.execute(db);

  await sql`
    CREATE TABLE posts (
      author                   TEXT NOT NULL,
      permlink                 TEXT NOT NULL,
      hive_id                  INT,
      author_reputation        INT NOT NULL DEFAULT 0,
      author_weight            DOUBLE PRECISION NOT NULL DEFAULT 0,
      parent_author            TEXT NOT NULL DEFAULT '',
      parent_permlink          TEXT NOT NULL DEFAULT '',
      title                    TEXT NOT NULL DEFAULT '',
      body                     TEXT NOT NULL DEFAULT '',
      json_metadata            TEXT NOT NULL DEFAULT '',
      app                      TEXT,
      depth                    INT,
      category                 TEXT,
      last_update              TEXT,
      created                  TEXT,
      active                   TEXT,
      last_payout              TEXT,
      children                 INT NOT NULL DEFAULT 0,
      net_rshares              BIGINT NOT NULL DEFAULT 0,
      abs_rshares              BIGINT NOT NULL DEFAULT 0,
      vote_rshares             BIGINT NOT NULL DEFAULT 0,
      children_abs_rshares     BIGINT,
      cashout_time             TEXT,
      reward_weight            TEXT,
      total_payout_value       TEXT NOT NULL DEFAULT '0.000 HBD',
      curator_payout_value     TEXT NOT NULL DEFAULT '0.000 HBD',
      author_rewards           INT,
      net_votes                INT,
      root_author              TEXT NOT NULL DEFAULT '',
      root_permlink            TEXT NOT NULL DEFAULT '',
      root_title               TEXT,
      max_accepted_payout      TEXT NOT NULL DEFAULT '1000000.000 HBD',
      percent_steem_dollars    INT,
      allow_replies            BOOLEAN,
      allow_votes              BOOLEAN,
      allow_curation_rewards   BOOLEAN,
      beneficiaries            JSONB NOT NULL DEFAULT '[]'::jsonb,
      url                      TEXT,
      pending_payout_value     TEXT NOT NULL DEFAULT '0.000 HBD',
      total_pending_payout_value TEXT NOT NULL DEFAULT '0.000 HBD',
      total_vote_weight        BIGINT,
      promoted                 TEXT,
      body_length              INT,
      net_rshares_WAIV         DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_payout_WAIV        DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_rewards_WAIV       DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_unix             BIGINT NOT NULL,
      PRIMARY KEY (author, permlink)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_posts_author_created_unix ON posts (author, created_unix DESC)`.execute(db);

  await sql`
    CREATE TABLE post_active_votes (
      author    TEXT NOT NULL,
      permlink  TEXT NOT NULL,
      voter     TEXT NOT NULL,
      weight    INT,
      percent   INT,
      rshares   BIGINT,
      rshares_waiv DOUBLE PRECISION,
      PRIMARY KEY (author, permlink, voter),
      FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
    )
  `.execute(db);

  await sql`CREATE INDEX idx_post_active_votes_voter ON post_active_votes (voter)`.execute(db);

  await sql`
    CREATE TABLE post_objects (
      author       TEXT NOT NULL,
      permlink     TEXT NOT NULL,
      object_id    TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
      percent      INT,
      tagged       TEXT,
      object_type  TEXT,
      PRIMARY KEY (author, permlink, object_id),
      FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
    )
  `.execute(db);

  await sql`CREATE INDEX idx_post_objects_object_id ON post_objects (object_id)`.execute(db);
  await sql`CREATE INDEX idx_post_objects_object_type ON post_objects (object_type) WHERE object_type IS NOT NULL`.execute(db);

  await sql`
    CREATE TABLE post_reblogged_users (
      author             TEXT NOT NULL,
      permlink           TEXT NOT NULL,
      account            TEXT NOT NULL,
      reblogged_at_unix  BIGINT NOT NULL,
      PRIMARY KEY (author, permlink, account),
      FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
    )
  `.execute(db);

  await sql`CREATE INDEX idx_post_reblogged_users_account_reblogged_at ON post_reblogged_users (account, reblogged_at_unix DESC)`.execute(db);

  await sql`
    CREATE TABLE post_languages (
      author    TEXT NOT NULL,
      permlink  TEXT NOT NULL,
      language  TEXT NOT NULL,
      PRIMARY KEY (author, permlink, language),
      FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
    )
  `.execute(db);

  await sql`CREATE INDEX idx_post_languages_language ON post_languages (language)`.execute(db);

  await sql`
    CREATE TABLE post_links (
      author    TEXT NOT NULL,
      permlink  TEXT NOT NULL,
      url       TEXT NOT NULL,
      PRIMARY KEY (author, permlink, url),
      FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
    )
  `.execute(db);

  await sql`CREATE INDEX idx_post_links_url ON post_links (url)`.execute(db);

  await sql`
    CREATE TABLE post_mentions (
      author    TEXT NOT NULL,
      permlink  TEXT NOT NULL,
      account   TEXT NOT NULL,
      PRIMARY KEY (author, permlink, account),
      FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
    )
  `.execute(db);

  await sql`CREATE INDEX idx_post_mentions_account ON post_mentions (account)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS post_mentions`.execute(db);
  await sql`DROP TABLE IF EXISTS post_links`.execute(db);
  await sql`DROP TABLE IF EXISTS post_languages`.execute(db);
  await sql`DROP TABLE IF EXISTS post_reblogged_users`.execute(db);
  await sql`DROP TABLE IF EXISTS post_objects`.execute(db);
  await sql`DROP TABLE IF EXISTS post_active_votes`.execute(db);
  await sql`DROP TABLE IF EXISTS posts`.execute(db);
  await sql`DROP TABLE IF EXISTS user_object_follows`.execute(db);
  await sql`DROP TABLE IF EXISTS user_subscriptions`.execute(db);
  await sql`DROP TABLE IF EXISTS user_post_bookmarks`.execute(db);
  await sql`DROP TABLE IF EXISTS user_referrals`.execute(db);
  await sql`DROP TABLE IF EXISTS user_notification_settings`.execute(db);
  await sql`DROP TABLE IF EXISTS user_metadata`.execute(db);
  await sql`DROP TRIGGER IF EXISTS tr_object_updates_search_vector ON object_updates`.execute(db);
  await sql`DROP FUNCTION IF EXISTS object_updates_search_vector_trigger()`.execute(db);
  await sql`DROP TABLE IF EXISTS object_authority`.execute(db);
  await sql`DROP TABLE IF EXISTS rank_votes`.execute(db);
  await sql`DROP TABLE IF EXISTS validity_votes`.execute(db);
  await sql`DROP TABLE IF EXISTS object_updates`.execute(db);
  await sql`DROP TABLE IF EXISTS objects_core`.execute(db);
  await sql`DROP TABLE IF EXISTS accounts_current`.execute(db);
}
