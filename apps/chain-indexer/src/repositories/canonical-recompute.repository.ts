import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';

@Injectable()
export class CanonicalRecomputeRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async enqueue(objectId: string): Promise<void> {
    const trimmed = objectId.trim();
    if (trimmed.length === 0) {
      return;
    }
    await this.db
      .insertInto('canonical_recompute_queue')
      .values({ object_id: trimmed, enqueued_at: new Date(), attempts: 0 })
      .onConflict((oc) =>
        oc.column('object_id').doUpdateSet({ enqueued_at: new Date() }),
      )
      .execute();
  }

  /**
   * Claim and remove up to `limit` object ids (burst-dedup coalesces to one recompute per id).
   */
  async claimObjectIds(limit: number): Promise<string[]> {
    const { rows } = await sql<{ object_id: string }>`
      WITH c AS (
        SELECT object_id
        FROM canonical_recompute_queue
        ORDER BY enqueued_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM canonical_recompute_queue q
      USING c
      WHERE q.object_id = c.object_id
      RETURNING q.object_id
    `.execute(this.db);
    return rows.map((r) => r.object_id);
  }
}
