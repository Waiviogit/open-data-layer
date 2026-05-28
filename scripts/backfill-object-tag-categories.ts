/**
 * Enqueue full recompute of object_tag_category_items from tagCategoryItem updates.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env scripts/backfill-object-tag-categories.ts [--dry-run]
 *
 * Requires POSTGRES_HOST, POSTGRES_USER, POSTGRES_DATABASE (and optionally POSTGRES_PASSWORD, POSTGRES_PORT).
 * DB connection is skipped when --dry-run.
 */
import { resolveConnectionString } from '../libs/migrations/src/connection';
import { type OdlDatabase } from '../libs/core/src/index';
import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';

interface CliOptions {
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  return { dryRun: argv.includes('--dry-run') };
}

function fail(message: string): never {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const pool = opts.dryRun ? null : new pg.Pool({ connectionString: resolveConnectionString() });
  const db = pool
    ? new Kysely<OdlDatabase>({ dialect: new PostgresDialect({ pool }) })
    : null;

  const enqueuedAt = Math.floor(Date.now() / 1000);

  try {
    if (db) {
      await sql`
        INSERT INTO object_tag_categories_sync_queue (object_id, enqueued_at, attempts, last_attempt_at)
        SELECT DISTINCT object_id, ${enqueuedAt}::bigint, 0::integer, NULL::bigint
        FROM object_updates
        WHERE update_type = ${'tagCategoryItem'}
        ON CONFLICT (object_id) DO NOTHING
      `.execute(db);
    } else if (opts.dryRun) {
      // eslint-disable-next-line no-console
      console.log(
        '[dry-run] Would enqueue object_ids from object_updates where update_type=tagCategoryItem',
      );
    } else {
      fail('Database connection required (omit --dry-run).');
    }

    // eslint-disable-next-line no-console
    console.log(
      `Done. dry_run=${opts.dryRun} enqueued_at=${enqueuedAt}. Run chain-indexer until object_tag_categories_sync_queue drains.`,
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
