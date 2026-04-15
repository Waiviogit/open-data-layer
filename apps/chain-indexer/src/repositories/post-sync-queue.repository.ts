import { Injectable, Inject } from '@nestjs/common';
import type { Kysely, Transaction } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { PostSyncQueueRow } from '@opden-data-layer/core';

@Injectable()
export class PostSyncQueueRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async enqueue(
    author: string,
    permlink: string,
    enqueuedAt: number,
    needsPostCreate: boolean,
    trx?: Transaction<Database>,
  ): Promise<void> {
    const executor = trx ?? this.db;
    await sql`
      INSERT INTO post_sync_queue (
        author,
        permlink,
        enqueued_at,
        needs_post_create,
        attempts,
        last_attempt_at
      )
      VALUES (
        ${author},
        ${permlink},
        ${enqueuedAt},
        ${needsPostCreate},
        0,
        NULL
      )
      ON CONFLICT (author, permlink) DO UPDATE SET
        needs_post_create = post_sync_queue.needs_post_create OR excluded.needs_post_create,
        enqueued_at = LEAST(post_sync_queue.enqueued_at, excluded.enqueued_at)
    `.execute(executor);
  }

  /**
   * Claims up to `limit` rows eligible for retry, locks them, bumps attempts and last_attempt_at.
   */
  async claimBatch(
    limit: number,
    retryAfterSec: number,
  ): Promise<PostSyncQueueRow[]> {
    const { rows } = await sql<PostSyncQueueRow>`
      WITH picked AS (
        SELECT author, permlink
        FROM post_sync_queue
        WHERE last_attempt_at IS NULL
          OR last_attempt_at < (EXTRACT(EPOCH FROM NOW())::bigint - ${retryAfterSec})
        ORDER BY last_attempt_at NULLS FIRST
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE post_sync_queue q
      SET
        last_attempt_at = EXTRACT(EPOCH FROM NOW())::bigint,
        attempts = q.attempts + 1
      FROM picked
      WHERE q.author = picked.author AND q.permlink = picked.permlink
      RETURNING q.*
    `.execute(this.db);

    return rows;
  }

  async deleteOne(author: string, permlink: string): Promise<void> {
    await this.db
      .deleteFrom('post_sync_queue')
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .execute();
  }

  async resetAttempt(author: string, permlink: string): Promise<void> {
    await this.db
      .updateTable('post_sync_queue')
      .set({ last_attempt_at: null })
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .execute();
  }
}
