-- PostgreSQL concept schema: objects_core, object_updates, validity_votes, rank_votes,
-- accounts_current (+ Waivio columns), user_* tables, posts and post_* satellite tables.
-- Requires: PostGIS extension for geo. No projection table; query directly via JOINs, tsvector, PostGIS.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- objects_core
-- ---------------------------------------------------------------------------
CREATE TABLE objects_core (
  object_id   TEXT NOT NULL PRIMARY KEY,
  object_type TEXT NOT NULL,
  creator     TEXT NOT NULL,
  weight      DOUBLE PRECISION,
  meta_group_id TEXT,
  canonical   TEXT,
  seq         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_objects_core_object_type_weight ON objects_core (object_type, weight DESC NULLS LAST);
CREATE INDEX idx_objects_core_creator ON objects_core (creator);

-- ---------------------------------------------------------------------------
-- object_updates
-- ---------------------------------------------------------------------------
CREATE TABLE object_updates (
  update_id       TEXT NOT NULL PRIMARY KEY,
  object_id       TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
  update_type     TEXT NOT NULL,
  creator         TEXT NOT NULL,
  -- BCP 47 language tag, e.g. en-US. Null = language-neutral.
  locale          TEXT,
  created_at_unix BIGINT NOT NULL,
  -- Packed canonical order: block_num(32)|trx_index(10)|op_index(8)|odl_event_index(8). See event-seq.ts.
  event_seq       BIGINT NOT NULL,
  transaction_id  TEXT NOT NULL,
  value_text      TEXT,
  value_geo       GEOGRAPHY(Point, 4326),
  value_json      JSONB,
  -- Generated column for case-insensitive exact match queries. Requires PG 12+.
  value_text_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(value_text))) STORED,
  search_vector   TSVECTOR,
  rank_score      INT,
  rank_context    TEXT,
  rank_decisive_event_seq BIGINT,
  -- Exactly one value column must be set.
  CONSTRAINT chk_exactly_one_value CHECK (
    (value_text IS NOT NULL)::int + (value_geo IS NOT NULL)::int + (value_json IS NOT NULL)::int = 1
  )
);

CREATE INDEX idx_object_updates_object_id_update_type ON object_updates (object_id, update_type);
CREATE INDEX idx_object_updates_search_vector ON object_updates USING GIN (search_vector);
CREATE INDEX idx_object_updates_value_geo ON object_updates USING GIST (value_geo);
CREATE INDEX idx_object_updates_update_type_value_text ON object_updates (update_type, value_text) WHERE value_text IS NOT NULL;
-- Case-insensitive exact match (uses the generated column; faster than LOWER(value_text) = $1).
CREATE INDEX idx_object_updates_update_type_value_text_normalized ON object_updates (update_type, value_text_normalized) WHERE value_text_normalized IS NOT NULL;
-- Trigram index for predictive-search name/title starts-with boost (LIKE 'query%'), incl. stopwords the english FTS strips.
CREATE INDEX idx_object_updates_name_title_value_norm_trgm ON object_updates USING GIN (value_text_normalized gin_trgm_ops) WHERE update_type IN ('name', 'title') AND value_text_normalized IS NOT NULL;
CREATE INDEX idx_object_updates_identifier_value_lower ON object_updates (lower(value_json->>'value') text_pattern_ops) WHERE update_type = 'identifier' AND value_json->>'value' IS NOT NULL;
CREATE INDEX idx_object_updates_address_locality_lower ON object_updates (lower(value_json->>'locality') text_pattern_ops) WHERE update_type = 'address' AND value_json->>'locality' IS NOT NULL;
CREATE INDEX idx_object_updates_object_rank_score ON object_updates (object_id, rank_score);

-- Trigger: keep search_vector in sync with value_text
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_object_updates_search_vector
  BEFORE INSERT OR UPDATE OF value_text ON object_updates
  FOR EACH ROW
  EXECUTE PROCEDURE object_updates_search_vector_trigger();

-- ---------------------------------------------------------------------------
-- validity_votes
-- ---------------------------------------------------------------------------
CREATE TABLE validity_votes (
  update_id      TEXT NOT NULL REFERENCES object_updates (update_id) ON DELETE CASCADE,
  object_id      TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
  voter          TEXT NOT NULL,
  vote           TEXT NOT NULL CHECK (vote IN ('for', 'against')),
  event_seq      BIGINT NOT NULL,
  transaction_id TEXT NOT NULL,
  PRIMARY KEY (update_id, voter)
);

CREATE INDEX idx_validity_votes_object_id ON validity_votes (object_id);

-- ---------------------------------------------------------------------------
-- rank_votes
-- ---------------------------------------------------------------------------
CREATE TABLE rank_votes (
  update_id      TEXT NOT NULL REFERENCES object_updates (update_id) ON DELETE CASCADE,
  object_id      TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
  voter          TEXT NOT NULL,
  rank           INT NOT NULL CHECK (rank >= 0 AND rank <= 10000),
  rank_context   TEXT NOT NULL,
  event_seq      BIGINT NOT NULL,
  transaction_id TEXT NOT NULL,
  PRIMARY KEY (update_id, voter, rank_context)
);

CREATE INDEX idx_rank_votes_object_id ON rank_votes (object_id);

-- ---------------------------------------------------------------------------
-- object_favorite
-- Heart / favorited-by edge. Written by object_favorite events.
-- ---------------------------------------------------------------------------
CREATE TABLE object_favorite (
  object_id   TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
  account     TEXT NOT NULL,
  event_seq   BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (object_id, account)
);

CREATE INDEX idx_object_favorite_account ON object_favorite (account);
CREATE INDEX idx_object_favorite_object_id ON object_favorite (object_id);

-- ---------------------------------------------------------------------------
-- object_ownership
-- Moderation edge with ownership_type exclusive | supervised.
-- Written by object_ownership events.
-- ---------------------------------------------------------------------------
CREATE TABLE object_ownership (
  object_id       TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
  account         TEXT NOT NULL,
  ownership_type  TEXT NOT NULL CHECK (ownership_type IN ('exclusive', 'supervised')),
  event_seq       BIGINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (object_id, account)
);

CREATE INDEX idx_object_ownership_account ON object_ownership (account);
CREATE INDEX idx_object_ownership_object_id_type ON object_ownership (object_id, ownership_type);
CREATE INDEX idx_object_ownership_object_id_type_created_at ON object_ownership (object_id, ownership_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- user_object_powers
-- WAIV stake + delegationsIn snapshot for accounts that participate in ODL voting.
-- See waiv-power.md (normative).
-- ---------------------------------------------------------------------------
CREATE TABLE user_object_powers (
  account           TEXT NOT NULL PRIMARY KEY,
  waiv_power        DOUBLE PRECISION NOT NULL DEFAULT 0,
  raw_waiv_power    DOUBLE PRECISION NOT NULL DEFAULT 0,
  waiv_power_dirty  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- user_waiv_power_history
-- Event-sourced WAIV power snapshots for 30-day rolling average.
-- See waiv-power.md (normative).
-- ---------------------------------------------------------------------------
CREATE TABLE user_waiv_power_history (
  id          BIGSERIAL PRIMARY KEY,
  account     TEXT NOT NULL,
  waiv_power  DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uwph_account_recorded_at
  ON user_waiv_power_history (account, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- accounts_current
-- Hive account state + ODL-computed object_reputation + Waivio/Mongo user fields.
-- Hive-sourced fields synced from Hive node API; object_reputation
-- maintained incrementally by Indexer from administrative authority events.
-- ---------------------------------------------------------------------------
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
);

CREATE INDEX idx_accounts_current_object_reputation ON accounts_current (object_reputation DESC NULLS LAST);
CREATE INDEX idx_accounts_current_hive_id ON accounts_current (hive_id) WHERE hive_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- user_metadata (1:1; UserMetadataSchema minus nested notifications)
-- ---------------------------------------------------------------------------
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
  currency                       TEXT,
  hide_linked_objects            BOOLEAN NOT NULL DEFAULT FALSE,
  hide_recipe_objects            BOOLEAN NOT NULL DEFAULT FALSE,
  hide_favorite_objects          BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- user_shop_deselect (per-user hide for post-linked shop/favorites objects)
-- ---------------------------------------------------------------------------
CREATE TABLE user_shop_deselect (
  account    TEXT NOT NULL REFERENCES accounts_current (name) ON DELETE CASCADE,
  object_id  TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
  PRIMARY KEY (account, object_id)
);

CREATE INDEX idx_user_shop_deselect_account ON user_shop_deselect (account);

-- ---------------------------------------------------------------------------
-- user_notification_settings (UserNotificationsSchema)
-- ---------------------------------------------------------------------------
CREATE TABLE user_notification_settings (
  account                TEXT NOT NULL PRIMARY KEY REFERENCES accounts_current (name) ON DELETE CASCADE,
  deactivation_campaign  BOOLEAN NOT NULL DEFAULT TRUE,
  follow                 BOOLEAN NOT NULL DEFAULT TRUE,
  fill_order             BOOLEAN NOT NULL DEFAULT TRUE,
  mention                BOOLEAN NOT NULL DEFAULT TRUE,
  minimal_transfer       DOUBLE PRECISION NOT NULL DEFAULT 0,
  reblog                 BOOLEAN NOT NULL DEFAULT TRUE,
  reply                  BOOLEAN NOT NULL DEFAULT TRUE,
  transfer               BOOLEAN NOT NULL DEFAULT TRUE,
  power_up               BOOLEAN NOT NULL DEFAULT TRUE,
  witness_vote           BOOLEAN NOT NULL DEFAULT TRUE,
  my_post                BOOLEAN NOT NULL DEFAULT FALSE,
  my_comment             BOOLEAN NOT NULL DEFAULT FALSE,
  my_like                BOOLEAN NOT NULL DEFAULT FALSE,
  vote                   BOOLEAN NOT NULL DEFAULT TRUE,
  downvote               BOOLEAN NOT NULL DEFAULT FALSE,
  claim_reward           BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_object_updates BOOLEAN NOT NULL DEFAULT TRUE,
  group_id_control       BOOLEAN NOT NULL DEFAULT TRUE,
  followed_user_threads  BOOLEAN NOT NULL DEFAULT TRUE,
  messages               BOOLEAN NOT NULL DEFAULT TRUE,
  obl                    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------------
-- telegram_subscriptions (Telegram notifications channel)
-- ---------------------------------------------------------------------------
CREATE TABLE telegram_subscriptions (
  chat_id    BIGINT NOT NULL,
  account    TEXT NOT NULL REFERENCES accounts_current (name) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (chat_id, account)
);

CREATE INDEX telegram_subscriptions_account_idx ON telegram_subscriptions (account);

-- ---------------------------------------------------------------------------
-- ops_telegram_subscribers (Telegram ops / system alerts)
-- ---------------------------------------------------------------------------
CREATE TABLE ops_telegram_subscribers (
  chat_id    BIGINT NOT NULL PRIMARY KEY,
  created_at BIGINT NOT NULL
);

-- ---------------------------------------------------------------------------
-- user_referrals (ReferralsSchema)
-- ---------------------------------------------------------------------------
CREATE TABLE user_referrals (
  account      TEXT NOT NULL REFERENCES accounts_current (name) ON DELETE CASCADE,
  agent        TEXT NOT NULL,
  type         TEXT NOT NULL,
  started_at   BIGINT,
  ended_at     BIGINT,
  PRIMARY KEY (account, agent, type)
);

CREATE INDEX idx_user_referrals_agent ON user_referrals (agent);

-- ---------------------------------------------------------------------------
-- user_post_bookmarks (post-only bookmarks from UserMetadataSchema.bookmarks)
-- ---------------------------------------------------------------------------
CREATE TABLE user_post_bookmarks (
  account   TEXT NOT NULL REFERENCES accounts_current (name) ON DELETE CASCADE,
  author    TEXT NOT NULL,
  permlink  TEXT NOT NULL,
  PRIMARY KEY (account, author, permlink)
);

CREATE INDEX idx_user_post_bookmarks_account ON user_post_bookmarks (account);

-- ---------------------------------------------------------------------------
-- user_subscriptions (SubscriptionSchema: follower / following)
-- ---------------------------------------------------------------------------
CREATE TABLE user_subscriptions (
  follower    TEXT NOT NULL,
  following   TEXT NOT NULL,
  bell        BOOLEAN,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower, following)
);

CREATE INDEX idx_user_subscriptions_following ON user_subscriptions (following);
CREATE INDEX idx_user_subscriptions_following_created_at ON user_subscriptions (following, created_at DESC);
CREATE INDEX idx_user_subscriptions_follower_created_at ON user_subscriptions (follower, created_at DESC);

-- ---------------------------------------------------------------------------
-- user_account_mutes (Hive follow ignore — pair-level social mute)
-- ---------------------------------------------------------------------------
CREATE TABLE user_account_mutes (
  muter   TEXT NOT NULL,
  muted   TEXT NOT NULL,
  PRIMARY KEY (muter, muted)
);

CREATE INDEX idx_user_account_mutes_muted ON user_account_mutes (muted);

-- ---------------------------------------------------------------------------
-- user_delegations (HP vesting delegations — chain-indexer + mongo import)
-- ---------------------------------------------------------------------------
CREATE TABLE user_delegations (
  delegator       TEXT NOT NULL,
  delegatee       TEXT NOT NULL,
  vesting_shares  DOUBLE PRECISION NOT NULL DEFAULT 0,
  delegation_date TIMESTAMPTZ,
  PRIMARY KEY (delegator, delegatee)
);

CREATE INDEX idx_user_delegations_delegatee ON user_delegations (delegatee);
CREATE INDEX idx_user_delegations_delegator ON user_delegations (delegator);

-- ---------------------------------------------------------------------------
-- user_rc_delegations (RC delegations — chain-indexer + mongo import)
-- ---------------------------------------------------------------------------
CREATE TABLE user_rc_delegations (
  delegator TEXT NOT NULL,
  delegatee TEXT NOT NULL,
  rc        BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (delegator, delegatee)
);

CREATE INDEX idx_user_rc_delegations_delegatee ON user_rc_delegations (delegatee);

-- ---------------------------------------------------------------------------
-- user_account_auths (Hive account_auths reverse index — chain-indexer)
-- ---------------------------------------------------------------------------
CREATE TABLE user_account_auths (
  grantor          TEXT NOT NULL,
  authority_type   TEXT NOT NULL CHECK (authority_type IN ('owner', 'active', 'posting')),
  grantee          TEXT NOT NULL,
  updated_at_block BIGINT NOT NULL,
  PRIMARY KEY (grantor, authority_type, grantee)
);

CREATE INDEX idx_user_account_auths_grantee_lookup
  ON user_account_auths (grantee, authority_type, grantor);

CREATE TABLE user_account_auth_sync (
  account      TEXT PRIMARY KEY,
  synced_at    TIMESTAMPTZ NOT NULL,
  synced_block BIGINT NOT NULL
);

-- ---------------------------------------------------------------------------
-- user_object_follows (UserSchema.objects_follow + bell)
-- ---------------------------------------------------------------------------
CREATE TABLE user_object_follows (
  account    TEXT NOT NULL REFERENCES accounts_current (name) ON DELETE CASCADE,
  object_id  TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
  bell       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account, object_id)
);

CREATE INDEX idx_user_object_follows_object_id ON user_object_follows (object_id);
CREATE INDEX idx_user_object_follows_account_created_at ON user_object_follows (account, created_at DESC);

-- ---------------------------------------------------------------------------
-- user_object_expertise (per-user per-object post-author expertise)
-- ---------------------------------------------------------------------------
CREATE TABLE user_object_expertise (
  account    TEXT NOT NULL REFERENCES accounts_current (name) ON DELETE CASCADE,
  object_id  TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
  weight     DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account, object_id)
);

CREATE INDEX idx_user_object_expertise_account_weight ON user_object_expertise (account, weight DESC);
CREATE INDEX idx_user_object_expertise_object_id ON user_object_expertise (object_id);

-- ---------------------------------------------------------------------------
-- posts (Hive post; normalized from legacy Mongo PostSchema)
-- Embedded arrays → post_active_votes, post_objects, post_reblogged_users,
-- post_languages, post_links, post_mentions. Omitted: blocked_for_apps,
-- language (singular), reblog_to.
-- ---------------------------------------------------------------------------
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
  rewards_finalized_at     TIMESTAMPTZ,
  expertise_applied_at     TIMESTAMPTZ,
  created_unix             BIGINT NOT NULL,
  PRIMARY KEY (author, permlink)
);

CREATE INDEX idx_posts_author_created_unix ON posts (author, created_unix DESC);
CREATE INDEX idx_posts_root_created_unix
  ON posts (created_unix DESC, author DESC, permlink DESC)
  WHERE depth = 0 OR depth IS NULL;
CREATE INDEX idx_posts_expertise_backfill_pending
  ON posts (rewards_finalized_at)
  WHERE (depth = 0 OR depth IS NULL)
    AND rewards_finalized_at IS NOT NULL
    AND expertise_applied_at IS NULL;

-- ---------------------------------------------------------------------------
-- post_active_votes
-- ---------------------------------------------------------------------------
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
);

CREATE INDEX idx_post_active_votes_voter ON post_active_votes (voter);

-- ---------------------------------------------------------------------------
-- post_objects (posts ↔ objects_core)
-- ---------------------------------------------------------------------------
CREATE TABLE post_objects (
  author       TEXT NOT NULL,
  permlink     TEXT NOT NULL,
  object_id    TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
  percent      INT,
  object_type  TEXT,
  PRIMARY KEY (author, permlink, object_id),
  FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
);

CREATE INDEX idx_post_objects_object_id ON post_objects (object_id);
CREATE INDEX idx_post_objects_object_type ON post_objects (object_type) WHERE object_type IS NOT NULL;
CREATE INDEX idx_post_objects_author ON post_objects (author);

-- ---------------------------------------------------------------------------
-- post_reblogged_users
-- ---------------------------------------------------------------------------
CREATE TABLE post_reblogged_users (
  author             TEXT NOT NULL,
  permlink           TEXT NOT NULL,
  account            TEXT NOT NULL,
  reblogged_at_unix  BIGINT NOT NULL,
  PRIMARY KEY (author, permlink, account),
  FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
);

CREATE INDEX idx_post_reblogged_users_account_reblogged_at ON post_reblogged_users (account, reblogged_at_unix DESC);

-- ---------------------------------------------------------------------------
-- post_languages
-- ---------------------------------------------------------------------------
CREATE TABLE post_languages (
  author    TEXT NOT NULL,
  permlink  TEXT NOT NULL,
  language  TEXT NOT NULL,
  PRIMARY KEY (author, permlink, language),
  FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
);

CREATE INDEX idx_post_languages_language ON post_languages (language);

-- ---------------------------------------------------------------------------
-- post_links
-- ---------------------------------------------------------------------------
CREATE TABLE post_links (
  author    TEXT NOT NULL,
  permlink  TEXT NOT NULL,
  url       TEXT NOT NULL,
  PRIMARY KEY (author, permlink, url),
  FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
);

CREATE INDEX idx_post_links_url ON post_links (url);

-- ---------------------------------------------------------------------------
-- post_mentions
-- ---------------------------------------------------------------------------
CREATE TABLE post_mentions (
  author    TEXT NOT NULL,
  permlink  TEXT NOT NULL,
  account   TEXT NOT NULL,
  PRIMARY KEY (author, permlink, account),
  FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
);

CREATE INDEX idx_post_mentions_account ON post_mentions (account);

-- ---------------------------------------------------------------------------
-- post_object_related_images (virtual Related gallery from post json_metadata.image)
-- ---------------------------------------------------------------------------
CREATE TABLE post_object_related_images (
  object_id   TEXT NOT NULL REFERENCES objects_core (object_id) ON DELETE CASCADE,
  author      TEXT NOT NULL,
  permlink    TEXT NOT NULL,
  image_url   TEXT NOT NULL,
  sort_ord    SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (object_id, author, permlink, image_url),
  FOREIGN KEY (author, permlink) REFERENCES posts (author, permlink) ON DELETE CASCADE
);

CREATE INDEX idx_post_object_related_images_object_id
  ON post_object_related_images (object_id);

-- ---------------------------------------------------------------------------
-- threads (Leo / Ecency thread-style Hive comments)
-- ---------------------------------------------------------------------------
CREATE TABLE threads (
  author               TEXT NOT NULL,
  permlink             TEXT NOT NULL,
  parent_author        TEXT NOT NULL,
  parent_permlink      TEXT NOT NULL,
  body                 TEXT NOT NULL DEFAULT '',
  created              TEXT,
  replies              TEXT[] NOT NULL DEFAULT '{}',
  children             INT NOT NULL DEFAULT 0,
  depth                INT NOT NULL DEFAULT 1,
  author_reputation    BIGINT,
  deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  tickers              TEXT[] NOT NULL DEFAULT '{}',
  mentions             TEXT[] NOT NULL DEFAULT '{}',
  hashtags             TEXT[] NOT NULL DEFAULT '{}',
  links                TEXT[] NOT NULL DEFAULT '{}',
  images               TEXT[] NOT NULL DEFAULT '{}',
  threadstorm          BOOLEAN NOT NULL DEFAULT FALSE,
  net_rshares          BIGINT,
  pending_payout_value TEXT,
  total_payout_value   TEXT,
  percent_hbd          DOUBLE PRECISION,
  cashout_time         TEXT,
  bulk_message         BOOLEAN NOT NULL DEFAULT FALSE,
  type                 TEXT NOT NULL CHECK (type IN ('leothreads', 'ecencythreads')),
  created_unix         BIGINT NOT NULL,
  updated_at_unix      BIGINT,
  PRIMARY KEY (author, permlink)
);

CREATE INDEX idx_threads_created_unix ON threads (created_unix DESC);

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
);

CREATE INDEX idx_thread_active_votes_voter ON thread_active_votes (voter);

-- ---------------------------------------------------------------------------
-- post_sync_queue (chain-indexer: Hive vote rshares / ghost post sync)
-- ---------------------------------------------------------------------------
CREATE TABLE post_sync_queue (
  author             TEXT NOT NULL,
  permlink           TEXT NOT NULL,
  enqueued_at        BIGINT NOT NULL,
  needs_post_create  BOOLEAN NOT NULL DEFAULT FALSE,
  attempts           INT NOT NULL DEFAULT 0,
  last_attempt_at    BIGINT,
  PRIMARY KEY (author, permlink)
);

CREATE INDEX idx_post_sync_queue_pending ON post_sync_queue (last_attempt_at NULLS FIRST);

-- ---------------------------------------------------------------------------
-- account_sync_queue (chain-indexer: Hive account recovery from get_accounts + social graph)
-- ---------------------------------------------------------------------------
CREATE TABLE account_sync_queue (
  account_name    TEXT NOT NULL PRIMARY KEY,
  enqueued_at     BIGINT NOT NULL,
  attempts        INT NOT NULL DEFAULT 0,
  last_attempt_at BIGINT
);

CREATE INDEX idx_account_sync_queue_pending ON account_sync_queue (last_attempt_at NULLS FIRST);

-- ---------------------------------------------------------------------------
-- user_post_drafts (editor drafts; optional link to Hive post via permlink)
-- ---------------------------------------------------------------------------
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
);

CREATE UNIQUE INDEX idx_user_post_drafts_author_permlink_unique
  ON user_post_drafts (author, permlink)
  WHERE permlink IS NOT NULL;

CREATE INDEX idx_user_post_drafts_author_last_updated
  ON user_post_drafts (author, last_updated DESC, draft_id DESC);

-- ---------------------------------------------------------------------------
-- hive_engine_swaps (chain-indexer: atomic marketpools swapTokens)
-- ---------------------------------------------------------------------------
CREATE TABLE hive_engine_swaps (
  id                      BIGSERIAL PRIMARY KEY,
  account                 TEXT NOT NULL,
  transaction_id          TEXT NOT NULL,
  block_number            INTEGER NOT NULL,
  ref_hive_block_number   INTEGER NULL,
  block_timestamp         TIMESTAMPTZ NOT NULL,
  symbol_out              TEXT NOT NULL,
  symbol_in               TEXT NOT NULL,
  symbol_out_quantity     TEXT NOT NULL,
  symbol_in_quantity      TEXT NOT NULL,
  symbols                 TEXT[] GENERATED ALWAYS AS (ARRAY[symbol_in, symbol_out]) STORED,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transaction_id, account)
);

CREATE INDEX idx_hes_account_ts_id
  ON hive_engine_swaps (account, block_timestamp DESC, id DESC);

CREATE INDEX idx_hes_symbols_gin
  ON hive_engine_swaps USING GIN (symbols);

-- ---------------------------------------------------------------------------
-- hive_engine_deposit_records (OSL hive_engine_deposit + legacy Mongo import)
-- ---------------------------------------------------------------------------
CREATE TABLE hive_engine_deposit_records (
  id                      BIGSERIAL PRIMARY KEY,
  account                 TEXT NOT NULL,
  transaction_id          TEXT NOT NULL,
  ref_hive_block_number   INTEGER NOT NULL,
  block_timestamp         TIMESTAMPTZ NOT NULL,
  destination             TEXT NOT NULL,
  symbol_in               TEXT NOT NULL,
  symbol_out              TEXT NOT NULL,
  pair                    TEXT NOT NULL,
  ex_rate                 DOUBLE PRECISION NOT NULL,
  deposit_account         TEXT,
  address                 TEXT,
  memo                    TEXT,
  symbols                 TEXT[] GENERATED ALWAYS AS (ARRAY[symbol_in, symbol_out]) STORED,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transaction_id, account)
);

CREATE INDEX idx_hedr_account_ts_id
  ON hive_engine_deposit_records (account, block_timestamp DESC, id DESC);

CREATE INDEX idx_hedr_symbols_gin
  ON hive_engine_deposit_records USING GIN (symbols);

-- ---------------------------------------------------------------------------
-- hive_engine_waiv_airdrops (historical WAIV airdrops; Mongo import only)
-- ---------------------------------------------------------------------------
CREATE TABLE hive_engine_waiv_airdrops (
  id                      BIGSERIAL PRIMARY KEY,
  account                 TEXT NOT NULL,
  transaction_id          TEXT NOT NULL,
  block_number            INTEGER NOT NULL,
  ref_hive_block_number   INTEGER NOT NULL,
  block_timestamp         TIMESTAMPTZ NOT NULL,
  quantity                TEXT NOT NULL,
  token_state             TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transaction_id, account)
);

CREATE INDEX idx_hewa_account_ts_id
  ON hive_engine_waiv_airdrops (account, block_timestamp DESC, id DESC);

-- ---------------------------------------------------------------------------
-- waiv_generated_reports (async WAIV advanced report jobs)
-- ---------------------------------------------------------------------------
CREATE TABLE waiv_generated_reports (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner                    TEXT NOT NULL,
  profile_account          TEXT NOT NULL,
  status                   TEXT NOT NULL,
  currency                 TEXT NOT NULL,
  start_date_ts            INTEGER NOT NULL,
  end_date_ts              INTEGER NOT NULL,
  filter_accounts          TEXT[] NOT NULL,
  include_swaps_and_trades BOOLEAN NOT NULL DEFAULT false,
  merge_rewards            BOOLEAN NOT NULL DEFAULT true,
  accounts_progress        JSONB NOT NULL DEFAULT '[]'::jsonb,
  merge_reward_fold        JSONB,
  deposits                 NUMERIC(20, 4) NOT NULL DEFAULT 0,
  withdrawals              NUMERIC(20, 4) NOT NULL DEFAULT 0,
  row_count                INTEGER NOT NULL DEFAULT 0,
  error_message            TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at             TIMESTAMPTZ
);

CREATE INDEX idx_waiv_generated_reports_owner_created
  ON waiv_generated_reports (owner, created_at DESC);

CREATE TABLE waiv_generated_report_rows (
  id              BIGSERIAL PRIMARY KEY,
  report_id       UUID NOT NULL REFERENCES waiv_generated_reports (id) ON DELETE CASCADE,
  operation_index INTEGER NOT NULL,
  timestamp       INTEGER NOT NULL,
  user_name       TEXT NOT NULL,
  checked         BOOLEAN NOT NULL DEFAULT false,
  row             JSONB NOT NULL
);

CREATE UNIQUE INDEX uq_waiv_generated_report_rows_report_operation
  ON waiv_generated_report_rows (report_id, operation_index);

CREATE INDEX idx_waiv_generated_report_rows_report_ts
  ON waiv_generated_report_rows (report_id, timestamp DESC, id DESC);
