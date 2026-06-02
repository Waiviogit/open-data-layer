/**
 * Backfill `user_object_powers` for all historical ODL participants.
 *
 * Collects unique accounts from: objects_core.creator, object_updates.creator,
 * validity_votes.voter, rank_votes.voter.
 * Skips accounts already present in `user_object_powers` (saves Engine RPC).
 * For each missing account, sets waiv_power = stake + delegationsIn (WAIV) from Hive Engine,
 * or 0 if no balances row (matches UserObjectPowersEnsureService).
 *
 * Usage:
 *   pnpm backfill:user-object-powers [--dry-run] [--batch-size 100]
 *
 * Requires POSTGRES_HOST, POSTGRES_USER, POSTGRES_DATABASE (and optionally POSTGRES_PASSWORD, POSTGRES_PORT).
 * Optional HIVE_ENGINE_NODES (comma-separated); defaults from libs/clients hive-engine constants.
 */
import type { OdlDatabase } from '../libs/core/src/index';
import { resolveConnectionString } from '../libs/migrations/src/connection';
import {
  HIVE_ENGINE_NODES,
  JSON_RPC_REQUEST_ID,
} from '../libs/clients/src/hive-engine-client/constants';
import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';

const WAIV_SYMBOL = 'WAIV';
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

interface CliOptions {
  dryRun: boolean;
  batchSize: number;
}

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let batchSize = 100;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (a === '--batch-size' && argv[i + 1]) {
      const n = Number.parseInt(argv[++i] ?? '', 10);
      if (Number.isFinite(n) && n > 0) {
        batchSize = Math.min(n, 1000);
      }
      continue;
    }
  }

  return { dryRun, batchSize };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function resolveHiveEngineNodes(): string[] {
  const raw = process.env['HIVE_ENGINE_NODES']?.trim();
  if (!raw) {
    return [...HIVE_ENGINE_NODES];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function sumStakeAndDelegationsIn(balance: {
  stake: string;
  delegationsIn: string;
}): number {
  const stake = parseFloat(balance.stake);
  const delegIn = parseFloat(balance.delegationsIn);
  const s = Number.isFinite(stake) ? stake : 0;
  const d = Number.isFinite(delegIn) ? delegIn : 0;
  return s + d;
}

function isBalanceRow(
  v: unknown,
): v is { account: string; stake: string; delegationsIn: string } {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    typeof o.account === 'string' &&
    typeof o.stake === 'string' &&
    typeof o.delegationsIn === 'string'
  );
}

function normalizeNodeBase(node: string): string {
  return node.replace(/\/+$/, '');
}

async function contractsFind(
  nodeBase: string,
  params: {
    contract: string;
    table: string;
    query: Record<string, unknown>;
    limit?: number;
  },
): Promise<unknown[]> {
  const url = `${normalizeNodeBase(nodeBase)}/contracts`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'find',
        params,
        id: JSON_RPC_REQUEST_ID,
      }),
      signal: controller.signal,
    });
    const data = (await resp.json()) as { result?: unknown; error?: unknown };
    if (!resp.ok || data.error) {
      throw new Error(
        `find failed: ${resp.status} ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`,
      );
    }
    if (Array.isArray(data.result)) {
      return data.result;
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Returns waiv_power per account (including 0 for missing balance rows). */
async function fetchWaivPowersForAccounts(
  nodes: string[],
  accounts: string[],
): Promise<Map<string, number>> {
  const params = {
    contract: 'tokens',
    table: 'balances',
    query: {
      symbol: WAIV_SYMBOL,
      account: { $in: accounts },
    },
    limit: 1000,
  };

  let lastErr: Error | undefined;
  for (const node of nodes) {
    try {
      const rows = await contractsFind(node, params);
      const map = new Map<string, number>();
      for (const r of rows) {
        if (!isBalanceRow(r)) {
          continue;
        }
        map.set(r.account, sumStakeAndDelegationsIn(r));
      }
      for (const a of accounts) {
        if (!map.has(a)) {
          map.set(a, 0);
        }
      }
      return map;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error('Hive Engine find: all nodes failed');
}

async function loadAccountsToBackfill(db: Kysely<OdlDatabase>): Promise<string[]> {
  const rows = await sql<{ account: string }>`
    SELECT DISTINCT TRIM(x.account) AS account
    FROM (
      SELECT creator AS account FROM objects_core
      UNION
      SELECT creator AS account FROM object_updates
      UNION
      SELECT voter AS account FROM validity_votes
      UNION
      SELECT voter AS account FROM rank_votes
    ) x
    WHERE TRIM(x.account) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM user_object_powers u WHERE u.account = TRIM(x.account)
      )
  `.execute(db);
  return rows.rows.map((r) => r.account);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  const nodes = resolveHiveEngineNodes();
  const pool = new pg.Pool({ connectionString: resolveConnectionString() });
  const db = new Kysely<OdlDatabase>({ dialect: new PostgresDialect({ pool }) });

  try {
    const accounts = await loadAccountsToBackfill(db);
    console.log(
      `Accounts to backfill: ${accounts.length} (batch_size=${opts.batchSize}, dry_run=${opts.dryRun})`,
    );

    if (accounts.length === 0) {
      console.log('Nothing to do.');
      return;
    }

    const batches = chunk(accounts, opts.batchSize);
    let inserted = 0;

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      if (!batch || batch.length === 0) {
        continue;
      }

      const powers = await fetchWaivPowersForAccounts(nodes, batch);
      const values = batch.map((account) => {
        const power = powers.get(account) ?? 0;
        return {
          account,
          waiv_power: power,
          raw_waiv_power: power,
          waiv_power_dirty: false,
        };
      });

      if (opts.dryRun) {
        console.log(
          `[dry-run] batch ${bi + 1}/${batches.length} size=${batch.length} sample=${JSON.stringify(values.slice(0, 3))}`,
        );
        inserted += values.length;
        continue;
      }

      await db
        .insertInto('user_object_powers')
        .values(values)
        .onConflict((oc) => oc.column('account').doNothing())
        .execute();
      inserted += values.length;

      console.log(`batch ${bi + 1}/${batches.length} done (rows attempted=${values.length})`);
    }

    console.log(`Done. row_batches=${batches.length} accounts_processed=${inserted} dry_run=${opts.dryRun}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
