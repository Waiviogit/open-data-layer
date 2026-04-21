import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Consolidated ODL PostgreSQL schema (former migrations 00001–00008).
 * Former 00001: objects_core, object_updates, validity_votes, rank_votes, object_authority,
 * accounts_current, user_* tables, posts and post_* satellite tables.
 * Former 00002: auth-api (auth_challenges, auth_identities, refresh_sessions).
 * Former 00003: user_post_drafts. Former 00004: threads, thread_active_votes.
 * Former 00005: drop legacy post_objects.tagged. Former 00006: user_account_mutes.
 * Former 00007: post_sync_queue. Former 00008: account_sync_queue.
 * Data-only migrations 00009–00012 (UPDATE object_updates.update_type) are omitted — fresh DB uses wire values from @opden-data-layer/core.
 * Source baseline: docs/spec/data-model/schema.sql; types: OdlDatabase.
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
      author_reputation        BIGINT NOT NULL DEFAULT 0,
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
      weight    DOUBLE PRECISION,
      percent   DOUBLE PRECISION,
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

  await sql`
    CREATE TABLE user_post_drafts (
      author           TEXT NOT NULL,
      draft_id         TEXT NOT NULL,
      title            TEXT NOT NULL DEFAULT '',
      body             TEXT NOT NULL DEFAULT '',
      json_metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
      parent_author    TEXT NOT NULL DEFAULT '',
      parent_permlink  TEXT NOT NULL DEFAULT '',
      permlink         TEXT,
      beneficiaries    JSONB NOT NULL DEFAULT '[]'::jsonb,
      last_updated     BIGINT NOT NULL,
      PRIMARY KEY (author, draft_id)
    )
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX idx_user_post_drafts_author_permlink_unique
    ON user_post_drafts (author, permlink)
    WHERE permlink IS NOT NULL
  `.execute(db);

  await sql`
    CREATE INDEX idx_user_post_drafts_author_last_updated
    ON user_post_drafts (author, last_updated DESC, draft_id DESC)
  `.execute(db);

  await sql`
    CREATE TABLE threads (
      author              TEXT NOT NULL,
      permlink            TEXT NOT NULL,
      parent_author       TEXT NOT NULL,
      parent_permlink     TEXT NOT NULL,
      body                TEXT NOT NULL DEFAULT '',
      created             TEXT,
      replies             TEXT[] NOT NULL DEFAULT '{}',
      children            INT NOT NULL DEFAULT 0,
      depth               INT NOT NULL DEFAULT 1,
      author_reputation   BIGINT,
      deleted             BOOLEAN NOT NULL DEFAULT FALSE,
      tickers             TEXT[] NOT NULL DEFAULT '{}',
      mentions            TEXT[] NOT NULL DEFAULT '{}',
      hashtags            TEXT[] NOT NULL DEFAULT '{}',
      links               TEXT[] NOT NULL DEFAULT '{}',
      images              TEXT[] NOT NULL DEFAULT '{}',
      threadstorm         BOOLEAN NOT NULL DEFAULT FALSE,
      net_rshares         BIGINT,
      pending_payout_value TEXT,
      total_payout_value  TEXT,
      percent_hbd         DOUBLE PRECISION,
      cashout_time        TEXT,
      bulk_message        BOOLEAN NOT NULL DEFAULT FALSE,
      type                TEXT NOT NULL CHECK (type IN ('leothreads', 'ecencythreads')),
      created_unix        BIGINT NOT NULL,
      updated_at_unix     BIGINT,
      PRIMARY KEY (author, permlink)
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_threads_created_unix ON threads (created_unix DESC)
  `.execute(db);

  await sql`
    CREATE TABLE thread_active_votes (
      author       TEXT NOT NULL,
      permlink     TEXT NOT NULL,
      voter        TEXT NOT NULL,
      weight       DOUBLE PRECISION,
      percent      DOUBLE PRECISION,
      rshares      BIGINT,
      rshares_waiv DOUBLE PRECISION,
      PRIMARY KEY (author, permlink, voter),
      FOREIGN KEY (author, permlink) REFERENCES threads (author, permlink) ON DELETE CASCADE
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_thread_active_votes_voter ON thread_active_votes (voter)
  `.execute(db);

  await sql`ALTER TABLE post_objects DROP COLUMN IF EXISTS tagged`.execute(db);

  await sql`
    CREATE TABLE user_account_mutes (
      muter   TEXT NOT NULL,
      muted   TEXT NOT NULL,
      PRIMARY KEY (muter, muted)
    )
  `.execute(db);

  await sql`CREATE INDEX idx_user_account_mutes_muted ON user_account_mutes (muted)`.execute(
    db,
  );

  await sql`
    CREATE TABLE post_sync_queue (
      author            TEXT NOT NULL,
      permlink          TEXT NOT NULL,
      enqueued_at       BIGINT NOT NULL,
      needs_post_create BOOLEAN NOT NULL DEFAULT FALSE,
      attempts          INT NOT NULL DEFAULT 0,
      last_attempt_at   BIGINT,
      PRIMARY KEY (author, permlink)
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_post_sync_queue_pending ON post_sync_queue (last_attempt_at NULLS FIRST)
  `.execute(db);

  await sql`
    CREATE TABLE account_sync_queue (
      account_name    TEXT NOT NULL PRIMARY KEY,
      enqueued_at     BIGINT NOT NULL,
      attempts        INT NOT NULL DEFAULT 0,
      last_attempt_at BIGINT
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_account_sync_queue_pending ON account_sync_queue (last_attempt_at NULLS FIRST)
  `.execute(db);
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  throw new Error('down not supported — drop the database and re-run up');
}
