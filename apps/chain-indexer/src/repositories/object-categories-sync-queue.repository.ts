import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { ObjectCategoriesSyncQueueRow } from '@opden-data-layer/core';

@Injectable()
export class ObjectCategoriesSyncQueueRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async enqueue(objectId: string, enqueuedAt: number): Promise<void> {
    await sql`
      INSERT INTO object_categories_sync_queue (
        object_id,
        enqueued_at,
        attempts,
        last_attempt_at
      )
      VALUES (
        ${objectId},
        ${enqueuedAt},
        0,
        NULL
      )
      ON CONFLICT (object_id) DO NOTHING
    `.execute(this.db);
  }

  async claimBatch(
    limit: number,
    retryAfterSec: number,
  ): Promise<ObjectCategoriesSyncQueueRow[]> {
    const { rows } = await sql<ObjectCategoriesSyncQueueRow>`
      WITH picked AS (
        SELECT object_id
        FROM object_categories_sync_queue
        WHERE last_attempt_at IS NULL
          OR last_attempt_at < (EXTRACT(EPOCH FROM NOW())::bigint - ${retryAfterSec})
        ORDER BY last_attempt_at NULLS FIRST
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE object_categories_sync_queue q
      SET
        last_attempt_at = EXTRACT(EPOCH FROM NOW())::bigint,
        attempts = q.attempts + 1
      FROM picked
      WHERE q.object_id = picked.object_id
      RETURNING q.*
    `.execute(this.db);

    return rows;
  }

  async deleteOne(objectId: string): Promise<void> {
    await this.db
      .deleteFrom('object_categories_sync_queue')
      .where('object_id', '=', objectId)
      .execute();
  }

  async resetAttempt(objectId: string): Promise<void> {
    await this.db
      .updateTable('object_categories_sync_queue')
      .set({ last_attempt_at: null })
      .where('object_id', '=', objectId)
      .execute();
  }
}
