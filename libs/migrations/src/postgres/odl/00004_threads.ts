import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Leo/Ecency-style thread rows + active votes (normalized like post_active_votes).
 * Types: @opden-data-layer/core ThreadsTable, ThreadActiveVotesTable.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
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
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS thread_active_votes`.execute(db);
  await sql`DROP TABLE IF EXISTS threads`.execute(db);
}
