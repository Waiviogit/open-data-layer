import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * Scheduler service: run metadata and Postgres-backed job queue
 * (dispatch → queue → worker). See apps/scheduler, docs/apps/scheduler.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE scheduler_job_runs (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_name     TEXT NOT NULL,
      trigger      TEXT NOT NULL
        CHECK (trigger IN ('scheduled', 'manual', 'retry')),
      status       TEXT NOT NULL
        CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')),
      attempt      INTEGER NOT NULL DEFAULT 1,
      started_at   TIMESTAMPTZ,
      finished_at  TIMESTAMPTZ,
      duration_ms  INTEGER,
      error        TEXT,
      payload      JSONB,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_scheduler_job_runs_job_name_created
    ON scheduler_job_runs (job_name, created_at DESC)
  `.execute(db);

  await sql`
    CREATE INDEX idx_scheduler_job_runs_status_job
    ON scheduler_job_runs (job_name, status)
  `.execute(db);

  await sql`
    CREATE TABLE scheduler_job_queue (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id        UUID NOT NULL REFERENCES scheduler_job_runs (id) ON DELETE CASCADE,
      job_name      TEXT NOT NULL,
      status        TEXT NOT NULL
        CHECK (status IN ('pending', 'claimed', 'done', 'dead')),
      available_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      attempts      INTEGER NOT NULL DEFAULT 0,
      max_attempts  INTEGER NOT NULL,
      last_error    TEXT,
      claimed_at    TIMESTAMPTZ
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_scheduler_job_queue_claim
    ON scheduler_job_queue (status, available_at)
    WHERE status = 'pending'
  `.execute(db);

  await sql`
    CREATE INDEX idx_scheduler_job_queue_run_id
    ON scheduler_job_queue (run_id)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS scheduler_job_queue`.execute(db);
  await sql`DROP TABLE IF EXISTS scheduler_job_runs`.execute(db);
}
