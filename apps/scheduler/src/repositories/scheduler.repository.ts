import { Inject, Injectable } from '@nestjs/common';
import type { Kysely, Transaction } from 'kysely';
import { sql } from 'kysely';
import type { JsonValue } from '@opden-data-layer/core';
import { KYSELY } from '../database';
import type { Database } from '../database/types';

export type JobTrigger = 'scheduled' | 'manual' | 'retry';

export type ClaimedSchedulerQueueItem = {
  queueId: string;
  runId: string;
  jobName: string;
  /** attempts value after this claim (1-based try index) */
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  payload: JsonValue | null;
  trigger: JobTrigger;
};

@Injectable()
export class SchedulerRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  private executor(trx?: Transaction<Database>): Kysely<Database> {
    return trx ?? this.db;
  }

  async hasIncompleteRun(
    jobName: string,
    trx?: Transaction<Database>,
  ): Promise<boolean> {
    return (await this.countIncompleteRuns(jobName, trx)) > 0;
  }

  async countIncompleteRuns(
    jobName: string,
    trx?: Transaction<Database>,
  ): Promise<number> {
    const r = await this.executor(trx)
      .selectFrom('scheduler_job_runs')
      .select((eb) => eb.fn.countAll<number>().as('n'))
      .where('job_name', '=', jobName)
      .where('status', 'in', ['pending', 'running'])
      .executeTakeFirst();
    return Number(r?.n ?? 0);
  }

  async insertSkippedRun(
    jobName: string,
    trigger: JobTrigger,
  ): Promise<string> {
    const row = await this.db
      .insertInto('scheduler_job_runs')
      .values({
        job_name: jobName,
        trigger,
        status: 'skipped',
        attempt: 0,
        started_at: null,
        finished_at: new Date(),
        duration_ms: 0,
        error: 'overlap: incomplete run already exists',
        payload: null,
        created_at: new Date(),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  }

  /**
   * Inserts a pending run and queue row. Caller should hold the enqueue Redis lock.
   */
  async insertRunWithQueue(
    jobName: string,
    trigger: JobTrigger,
    maxAttempts: number,
    payload: JsonValue | null,
  ): Promise<{ runId: string; queueId: string }> {
    return this.db.transaction().execute(async (trx) => {
      const run = await trx
        .insertInto('scheduler_job_runs')
        .values({
          job_name: jobName,
          trigger,
          status: 'pending',
          attempt: 0,
          started_at: null,
          finished_at: null,
          duration_ms: null,
          error: null,
          payload: payload ?? null,
          created_at: new Date(),
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const q = await trx
        .insertInto('scheduler_job_queue')
        .values({
          run_id: run.id,
          job_name: jobName,
          status: 'pending',
          available_at: new Date(),
          attempts: 0,
          max_attempts: maxAttempts,
          last_error: null,
          claimed_at: null,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      return { runId: run.id, queueId: q.id };
    });
  }

  /**
   * Claims work; bumps queue.attempts and sets status=claimed, claimed_at=now().
   */
  async claimBatch(
    limit: number,
  ): Promise<ClaimedSchedulerQueueItem[]> {
    const { rows } = await sql<{
      qid: string;
      rid: string;
      jn: string;
      attempts: number;
      maxAttempts: number;
      lastError: string | null;
      payload: JsonValue | null;
      tg: string;
    }>`
      WITH picked AS (
        SELECT q2.id
        FROM scheduler_job_queue q2
        WHERE q2.status = 'pending'
          AND q2.available_at <= NOW()
        ORDER BY q2.available_at ASC, q2.id ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE scheduler_job_queue q
      SET
        status = 'claimed',
        attempts = q.attempts + 1,
        claimed_at = NOW()
      FROM picked
      INNER JOIN scheduler_job_runs r ON r.id = q.run_id
      WHERE q.id = picked.id
      RETURNING
        q.id as "qid",
        q.run_id as "rid",
        q.job_name as "jn",
        q.attempts as "attempts",
        q.max_attempts as "maxAttempts",
        q.last_error as "lastError",
        r.payload,
        r.trigger as "tg"
    `.execute(this.db);

    return rows.map((r) => ({
      queueId: r.qid,
      runId: r.rid,
      jobName: r.jn,
      attempts: r.attempts,
      maxAttempts: r.maxAttempts,
      lastError: r.lastError,
      payload: r.payload,
      trigger: r.tg as JobTrigger,
    }));
  }

  async setRunToRunning(
    runId: string,
    attempt: number,
  ): Promise<void> {
    await this.db
      .updateTable('scheduler_job_runs')
      .set({
        status: 'running',
        attempt,
        started_at: new Date(),
        finished_at: null,
        duration_ms: null,
        error: null,
      })
      .where('id', '=', runId)
      .execute();
  }

  async completeSuccess(
    runId: string,
    queueId: string,
    durationMs: number,
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      const now = new Date();
      await trx
        .updateTable('scheduler_job_runs')
        .set({
          status: 'success',
          finished_at: now,
          duration_ms: durationMs,
          error: null,
        })
        .where('id', '=', runId)
        .execute();
      await trx
        .updateTable('scheduler_job_queue')
        .set({ status: 'done' })
        .where('id', '=', queueId)
        .execute();
    });
  }

  async failAndRequeue(
    runId: string,
    queueId: string,
    errMsg: string,
    retryAfterMs: number,
  ): Promise<void> {
    const next = new Date(Date.now() + retryAfterMs);
    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('scheduler_job_queue')
        .set({
          status: 'pending',
          available_at: next,
          last_error: errMsg,
          claimed_at: null,
        })
        .where('id', '=', queueId)
        .execute();
      // run stays in 'running' until final outcome
    });
  }

  async failPermanently(
    runId: string,
    queueId: string,
    errMsg: string,
    durationMs: number,
  ): Promise<void> {
    const now = new Date();
    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('scheduler_job_runs')
        .set({
          status: 'failed',
          finished_at: now,
          duration_ms: durationMs,
          error: errMsg,
        })
        .where('id', '=', runId)
        .execute();
      await trx
        .updateTable('scheduler_job_queue')
        .set({ status: 'dead', last_error: errMsg, claimed_at: null })
        .where('id', '=', queueId)
        .execute();
    });
  }
}
