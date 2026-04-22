# scheduler — agent rules

Background service: NestJS **application context** only — **no HTTP server**. Shared policy (Kysely, Redis via `RedisClientFactory`, logging, Nx) lives in the repo root [`AGENTS.md`](../../AGENTS.md).

## Role

- Registers **cron** jobs from [`src/jobs/jobs.registry.ts`](src/jobs/jobs.registry.ts).
- **Enqueue path**: Redis `SET NX` lock → insert `scheduler_job_runs` + `scheduler_job_queue` in one transaction.
- **Worker** interval claims from the queue and runs handlers (timeout, retries, overlap rules).

## Manual run

Process args `--run-job=` / `--payload=`; cron and worker interval are skipped; the app enqueues, drains the queue, exits. See [`docs/apps/scheduler/spec/overview.md`](../../docs/apps/scheduler/spec/overview.md).
