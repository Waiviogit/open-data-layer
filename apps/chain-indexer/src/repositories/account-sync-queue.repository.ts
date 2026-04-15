import { Injectable, Inject } from '@nestjs/common';
import type { Kysely, Transaction } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { AccountSyncQueueRow } from '@opden-data-layer/core';

@Injectable()
export class AccountSyncQueueRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async enqueue(
    accountName: string,
    enqueuedAt: number,
    trx?: Transaction<Database>,
  ): Promise<void> {
    const executor = trx ?? this.db;
    await sql`
      INSERT INTO account_sync_queue (
        account_name,
        enqueued_at,
        attempts,
        last_attempt_at
      )
      VALUES (
        ${accountName},
        ${enqueuedAt},
        0,
        NULL
      )
      ON CONFLICT (account_name) DO NOTHING
    `.execute(executor);
  }

  /**
   * Claims up to `limit` rows eligible for retry, locks them, bumps attempts and last_attempt_at.
   */
  async claimBatch(
    limit: number,
    retryAfterSec: number,
  ): Promise<AccountSyncQueueRow[]> {
    const { rows } = await sql<AccountSyncQueueRow>`
      WITH picked AS (
        SELECT account_name
        FROM account_sync_queue
        WHERE last_attempt_at IS NULL
          OR last_attempt_at < (EXTRACT(EPOCH FROM NOW())::bigint - ${retryAfterSec})
        ORDER BY last_attempt_at NULLS FIRST
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE account_sync_queue q
      SET
        last_attempt_at = EXTRACT(EPOCH FROM NOW())::bigint,
        attempts = q.attempts + 1
      FROM picked
      WHERE q.account_name = picked.account_name
      RETURNING q.*
    `.execute(this.db);

    return rows;
  }

  async deleteOne(accountName: string): Promise<void> {
    await this.db
      .deleteFrom('account_sync_queue')
      .where('account_name', '=', accountName)
      .execute();
  }

  async resetAttempt(accountName: string): Promise<void> {
    await this.db
      .updateTable('account_sync_queue')
      .set({ last_attempt_at: null })
      .where('account_name', '=', accountName)
      .execute();
  }
}
