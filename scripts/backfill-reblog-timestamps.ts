/**
 * Overwrite fabricated `post_reblogged_users.reblogged_at_unix` from Hive
 * `condenser_api.get_blog_entries.reblogged_on` for every reblogger account.
 *
 * Required after `pnpm migrate:mongo-posts` — mongo stores reblogger names only.
 *
 * Usage:
 *   pnpm backfill:reblog-timestamps [--dry-run] [--account=name] [--reset-checkpoint]
 *
 * Env:
 *   HIVE_RPC_URL          comma-separated Hive RPC nodes (optional)
 *   HIVE_RPC_DELAY_MS     sleep between RPC pages (default 250)
 *   REBLOG_BACKFILL_CHECKPOINT  checkpoint file path
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  CONDENSER_API,
  HIVE_BLOG_ENTRIES_MAX_LIMIT,
  HIVE_RPC_NODES,
  clampHiveBlogEntriesLimit,
  isHiveBlogReblogEntry,
  nextHiveBlogEntriesStart,
  shouldOverwriteRebloggedAtUnix,
  type HiveBlogEntry,
} from '@opden-data-layer/clients';
import { blockTimestampToUnixSeconds } from '@opden-data-layer/core';
import type { OdlDatabase } from '@opden-data-layer/odl-db-types';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

import { resolveConnectionString } from '../libs/migrations/src/connection';
import {
  accountsPendingReblogBackfill,
  markReblogBackfillCompleted,
  parseReblogBackfillCheckpoint,
  type ReblogBackfillCheckpoint,
} from '../apps/chain-indexer/src/domain/hive-social/reblog-backfill-checkpoint';

const DEFAULT_CHECKPOINT = resolve(
  process.cwd(),
  'scripts/.backfill-reblog-timestamps.checkpoint.json',
);
const HIVE_DELAY_MS = Number(process.env['HIVE_RPC_DELAY_MS'] ?? 250);
const SAMPLE_LIMIT = 20;
const PAGE_LIMIT = clampHiveBlogEntriesLimit(HIVE_BLOG_ENTRIES_MAX_LIMIT);

type CliOptions = {
  dryRun: boolean;
  account: string | undefined;
  resetCheckpoint: boolean;
  checkpointPath: string;
};

type AccountRow = {
  account: string;
  n: number;
};

type ExistingReblog = {
  author: string;
  permlink: string;
  reblogged_at_unix: number;
};

type SampleDiff = {
  account: string;
  author: string;
  permlink: string;
  existingUnix: number;
  hiveUnix: number;
};

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let account: string | undefined;
  let resetCheckpoint = false;
  let checkpointPath = process.env['REBLOG_BACKFILL_CHECKPOINT']?.trim() || DEFAULT_CHECKPOINT;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--reset-checkpoint') {
      resetCheckpoint = true;
      continue;
    }
    if (arg.startsWith('--account=')) {
      const name = arg.slice('--account='.length).trim().toLowerCase();
      account = name || undefined;
      continue;
    }
    if (arg.startsWith('--checkpoint=')) {
      checkpointPath = resolve(arg.slice('--checkpoint='.length).trim() || checkpointPath);
    }
  }

  return { dryRun, account, resetCheckpoint, checkpointPath };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function resolveHiveNodes(): string[] {
  const raw = process.env['HIVE_RPC_URL']?.trim();
  if (raw) {
    const nodes = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (nodes.length > 0) {
      return nodes;
    }
  }
  return [...HIVE_RPC_NODES];
}

function loadCheckpoint(path: string): ReblogBackfillCheckpoint {
  if (!existsSync(path)) {
    return { completed: [], updatedAt: '' };
  }
  try {
    return parseReblogBackfillCheckpoint(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return { completed: [], updatedAt: '' };
  }
}

function saveCheckpoint(path: string, completed: readonly string[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const body = JSON.stringify(
    {
      completed: [...completed],
      updatedAt: new Date().toISOString(),
    } satisfies ReblogBackfillCheckpoint,
    null,
    2,
  );
  writeFileSync(path, `${body}\n`, 'utf8');
}

function parseBlogEntries(raw: unknown): HiveBlogEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: HiveBlogEntry[] = [];
  for (const row of raw) {
    if (row == null || typeof row !== 'object') {
      continue;
    }
    const rec = row as Record<string, unknown>;
    if (
      typeof rec['author'] !== 'string' ||
      typeof rec['permlink'] !== 'string' ||
      typeof rec['reblogged_on'] !== 'string' ||
      typeof rec['entry_id'] !== 'number'
    ) {
      continue;
    }
    out.push({
      blog: typeof rec['blog'] === 'string' ? rec['blog'] : '',
      author: rec['author'],
      permlink: rec['permlink'],
      entry_id: rec['entry_id'],
      reblogged_on: rec['reblogged_on'],
    });
  }
  return out;
}

async function hiveGetBlogEntries(
  nodes: string[],
  account: string,
  start: number,
  limit: number,
): Promise<HiveBlogEntry[]> {
  let lastError: unknown;
  for (const node of nodes) {
    try {
      const res = await fetch(node, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: CONDENSER_API.GET_BLOG_ENTRIES,
          params: [account, start, limit],
          id: 1,
        }),
      });
      if (!res.ok) {
        lastError = new Error(`${node} HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
      if (json.error?.message) {
        lastError = new Error(json.error.message);
        continue;
      }
      return parseBlogEntries(json.result);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`get_blog_entries failed for ${account}`);
}

async function loadAllBlogReblogs(
  nodes: string[],
  account: string,
): Promise<HiveBlogEntry[]> {
  const entries: HiveBlogEntry[] = [];
  let start = 0;
  for (;;) {
    const page = await hiveGetBlogEntries(nodes, account, start, PAGE_LIMIT);
    await sleep(Number.isFinite(HIVE_DELAY_MS) && HIVE_DELAY_MS > 0 ? HIVE_DELAY_MS : 250);
    for (const entry of page) {
      if (isHiveBlogReblogEntry(account, entry)) {
        entries.push(entry);
      }
    }
    const last = page[page.length - 1];
    const next = last
      ? nextHiveBlogEntriesStart(last.entry_id, page.length, PAGE_LIMIT)
      : null;
    if (next == null) {
      break;
    }
    start = next;
  }
  return entries;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.resetCheckpoint && existsSync(opts.checkpointPath)) {
    unlinkSync(opts.checkpointPath);
    console.log(`Reset checkpoint ${opts.checkpointPath}`);
  }

  const db = new Kysely<OdlDatabase>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString: resolveConnectionString() }),
    }),
  });

  const nodes = resolveHiveNodes();
  let checkpoint = opts.account
    ? { completed: [] as string[], updatedAt: '' }
    : loadCheckpoint(opts.checkpointPath);

  try {
    let query = db
      .selectFrom('post_reblogged_users')
      .select(['account'])
      .select((eb) => eb.fn.countAll<number>().as('n'))
      .groupBy('account')
      .orderBy('n', 'desc')
      .orderBy('account', 'asc');
    if (opts.account) {
      query = query.where('account', '=', opts.account);
    }
    const accounts = accountsPendingReblogBackfill(
      (await query.execute()) as AccountRow[],
      checkpoint.completed,
    );

    console.log(
      `Accounts: ${accounts.length} remaining${opts.account ? ` (filter @${opts.account})` : ''}` +
        `${opts.dryRun ? ' [dry-run]' : ''}` +
        `${checkpoint.completed.length > 0 ? `; skip ${checkpoint.completed.length} completed` : ''}`,
    );

    let updated = 0;
    let skippedClose = 0;
    let unmatchedLocal = 0;
    let accountErrors = 0;
    const samples: SampleDiff[] = [];

    for (const row of accounts) {
      let hiveEntries: HiveBlogEntry[];
      try {
        hiveEntries = await loadAllBlogReblogs(nodes, row.account);
      } catch (error) {
        accountErrors += 1;
        console.error(
          `@${row.account}: Hive RPC failed (${
            error instanceof Error ? error.message : String(error)
          }); continuing`,
        );
        continue;
      }

      const existing = (await db
        .selectFrom('post_reblogged_users')
        .select(['author', 'permlink', 'reblogged_at_unix'])
        .where('account', '=', row.account)
        .execute()) as ExistingReblog[];
      const byKey = new Map(
        existing.map((r) => [`${r.author}/${r.permlink}`, r] as const),
      );
      const seen = new Set<string>();
      let accountUpdated = 0;

      for (const entry of hiveEntries) {
        const key = `${entry.author}/${entry.permlink}`;
        seen.add(key);
        const local = byKey.get(key);
        if (!local) {
          continue;
        }
        const hiveUnix = blockTimestampToUnixSeconds(entry.reblogged_on);
        if (hiveUnix <= 0) {
          continue;
        }
        if (!shouldOverwriteRebloggedAtUnix(local.reblogged_at_unix, hiveUnix)) {
          skippedClose += 1;
          continue;
        }
        if (samples.length < SAMPLE_LIMIT) {
          samples.push({
            account: row.account,
            author: entry.author,
            permlink: entry.permlink,
            existingUnix: local.reblogged_at_unix,
            hiveUnix,
          });
        }
        if (!opts.dryRun) {
          await db
            .updateTable('post_reblogged_users')
            .set({ reblogged_at_unix: hiveUnix })
            .where('author', '=', local.author)
            .where('permlink', '=', local.permlink)
            .where('account', '=', row.account)
            .execute();
        }
        accountUpdated += 1;
        updated += 1;
      }

      for (const [key] of byKey) {
        if (!seen.has(key)) {
          unmatchedLocal += 1;
          console.log(`@${row.account}: no Hive blog entry for ${key}; left untouched`);
        }
      }

      console.log(
        `@${row.account}: hiveReblogs=${hiveEntries.length} local=${existing.length} wrote=${accountUpdated}`,
      );
      if (!opts.dryRun) {
        checkpoint = {
          completed: markReblogBackfillCompleted(checkpoint.completed, row.account),
          updatedAt: new Date().toISOString(),
        };
        saveCheckpoint(opts.checkpointPath, checkpoint.completed);
      }
    }

    if (samples.length > 0) {
      console.log('Sample diffs (existing → hive):');
      for (const s of samples) {
        console.log(
          `  @${s.account} ${s.author}/${s.permlink} ${s.existingUnix} → ${s.hiveUnix}`,
        );
      }
    }

    console.log(
      `Done. updated=${updated} skippedClose=${skippedClose} unmatchedLocal=${unmatchedLocal} accountErrors=${accountErrors}`,
    );
    if (accountErrors > 0) {
      process.exitCode = 1;
    }
  } finally {
    await db.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
