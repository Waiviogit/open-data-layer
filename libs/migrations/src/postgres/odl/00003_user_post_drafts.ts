import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * User-editable post drafts (editor). Types: @opden-data-layer/core UserPostDraftsTable.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
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
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS user_post_drafts`.execute(db);
}
