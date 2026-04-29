/**
 * Enqueue full recompute of object_categories and object_categories_related scopes.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env scripts/backfill-object-categories.ts [--dry-run] [--only-objects] [--only-scopes]
 *
 * Requires DATABASE_URL (unless --dry-run).
 */
import {
  type OdlDatabase,
  buildUserScopeKey,
  SHOP_TYPE_BUCKETS,
} from '../libs/core/src/index';
import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';

interface CliOptions {
  dryRun: boolean;
  onlyObjects: boolean;
  onlyScopes: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let onlyObjects = false;
  let onlyScopes = false;
  for (const a of argv) {
    if (a === '--dry-run') dryRun = true;
    if (a === '--only-objects') onlyObjects = true;
    if (a === '--only-scopes') onlyScopes = true;
  }
  return { dryRun, onlyObjects, onlyScopes };
}

function fail(message: string): never {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.dryRun && !process.env['DATABASE_URL']?.trim()) {
    fail('DATABASE_URL is required unless --dry-run.');
  }

  const pool = opts.dryRun ? null : new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
  const db = pool
    ? new Kysely<OdlDatabase>({ dialect: new PostgresDialect({ pool }) })
    : null;

  const enqueuedAt = Math.floor(Date.now() / 1000);

  try {
    const doObjects = !opts.onlyScopes;
    const doScopes = !opts.onlyObjects;

    if (doObjects && db) {
      await sql`
        INSERT INTO object_categories_sync_queue (object_id, enqueued_at, attempts, last_attempt_at)
        SELECT DISTINCT object_id, ${enqueuedAt}::bigint, 0::integer, NULL::bigint
        FROM object_updates
        WHERE update_type = ${'category'}
        ON CONFLICT (object_id) DO NOTHING
      `.execute(db);

    } else if (doObjects && opts.dryRun) {
      // eslint-disable-next-line no-console
      console.log('[dry-run] Would enqueue object_ids from object_updates where update_type=category');
    }

    if (doScopes && db) {
      await sql`
        INSERT INTO object_categories_related_sync_queue
          (scope_type, scope_key, enqueued_at, attempts, last_attempt_at)
        VALUES ('global', '_', ${enqueuedAt}::bigint, 0::integer, NULL::bigint)
        ON CONFLICT (scope_type, scope_key) DO NOTHING
      `.execute(db);

      const authorityRows = await db
        .selectFrom('object_authority')
        .select('account')
        .distinct()
        .where('authority_type', 'in', ['ownership', 'administrative'])
        .execute();

      const postRows = await db.selectFrom('post_objects').select('author').distinct().execute();

      const accountSet = new Set<string>();
      for (const r of authorityRows) {
        accountSet.add(r.account);
      }
      for (const r of postRows) {
        accountSet.add(r.author);
      }

      for (const account of accountSet) {
        for (const bucket of SHOP_TYPE_BUCKETS) {
          const scopeKey = buildUserScopeKey(account, bucket);
          await sql`
            INSERT INTO object_categories_related_sync_queue
              (scope_type, scope_key, enqueued_at, attempts, last_attempt_at)
            VALUES ('user', ${scopeKey}, ${enqueuedAt}::bigint, 0::integer, NULL::bigint)
            ON CONFLICT (scope_type, scope_key) DO NOTHING
          `.execute(db);
        }
      }

    } else if (doScopes && opts.dryRun) {
      // eslint-disable-next-line no-console
      console.log(
        '[dry-run] Would enqueue global scope + each user shop bucket (authority or post_objects authors).',
      );
    }

    // eslint-disable-next-line no-console
    console.log(
      `Done. dry_run=${opts.dryRun} do_objects=${doObjects} do_scopes=${doScopes} enqueued_at=${enqueuedAt}`,
    );
    // eslint-disable-next-line no-console
    console.log('Run chain-indexer workers until both queues drain.');
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
