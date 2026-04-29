import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  ObjectCategoriesRelatedScopeType,
  ObjectCategoriesRelatedSyncQueueRow,
} from '@opden-data-layer/core';

@Injectable()
export class ObjectCategoriesRelatedSyncQueueRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async enqueue(
    scopeType: ObjectCategoriesRelatedScopeType,
    scopeKey: string,
    enqueuedAt: number,
  ): Promise<void> {
    await sql`
      INSERT INTO object_categories_related_sync_queue (
        scope_type,
        scope_key,
        enqueued_at,
        attempts,
        last_attempt_at
      )
      VALUES (
        ${scopeType},
        ${scopeKey},
        ${enqueuedAt},
        0,
        NULL
      )
      ON CONFLICT (scope_type, scope_key) DO NOTHING
    `.execute(this.db);
  }

  async claimBatch(
    limit: number,
    retryAfterSec: number,
  ): Promise<ObjectCategoriesRelatedSyncQueueRow[]> {
    const { rows } = await sql<ObjectCategoriesRelatedSyncQueueRow>`
      WITH picked AS (
        SELECT scope_type, scope_key
        FROM object_categories_related_sync_queue
        WHERE last_attempt_at IS NULL
          OR last_attempt_at < (EXTRACT(EPOCH FROM NOW())::bigint - ${retryAfterSec})
        ORDER BY last_attempt_at NULLS FIRST
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE object_categories_related_sync_queue q
      SET
        last_attempt_at = EXTRACT(EPOCH FROM NOW())::bigint,
        attempts = q.attempts + 1
      FROM picked
      WHERE q.scope_type = picked.scope_type AND q.scope_key = picked.scope_key
      RETURNING q.*
    `.execute(this.db);

    return rows;
  }

  async deleteOne(
    scopeType: ObjectCategoriesRelatedScopeType,
    scopeKey: string,
  ): Promise<void> {
    await this.db
      .deleteFrom('object_categories_related_sync_queue')
      .where('scope_type', '=', scopeType)
      .where('scope_key', '=', scopeKey)
      .execute();
  }

  async resetAttempt(
    scopeType: ObjectCategoriesRelatedScopeType,
    scopeKey: string,
  ): Promise<void> {
    await this.db
      .updateTable('object_categories_related_sync_queue')
      .set({ last_attempt_at: null })
      .where('scope_type', '=', scopeType)
      .where('scope_key', '=', scopeKey)
      .execute();
  }
}
