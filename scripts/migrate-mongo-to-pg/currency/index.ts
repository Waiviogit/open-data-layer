/**
 * Stream Mongo-export JSON array files (`mongoexport --jsonArray`) into ODL Postgres
 * `currency_statistics`, `hive_engine_rates`, `currency_rates`.
 *
 * Same pattern as `scripts/migrate-mongo-to-pg/objects`: one `.json` per collection,
 * UTF-8, top-level JSON array of documents.
 *
 * Usage:
 *   pnpm migrate:mongo-currency [--dry-run] [--only=stats,engine,fiat]
 *     [--stats=<path>] [--engine=<path>] [--fiat=<path>]
 *
 * Paths may also be given positionally in order: stats, engine, fiat
 * (any omitted bucket is skipped).
 *
 * Docker (migrator + three mounts), order must be stats → engine → fiat:
 *   sudo docker compose -p apps --env-file .env -f docker-compose.staging.apps.yml \
 *     --profile tools run --rm \
 *     -v /path/on/host/currency_statistics.json:/data/currency_statistics.json \
 *     -v /path/on/host/hive_engine_rates.json:/data/hive_engine_rates.json \
 *     -v /path/on/host/currency_rates.json:/data/currency_rates.json \
 *     migrator \
 *     pnpm migrate:mongo-currency /data/currency_statistics.json \
 *       /data/hive_engine_rates.json /data/currency_rates.json
 *
 * Requires POSTGRES_HOST, POSTGRES_USER, POSTGRES_DATABASE
 * (and optionally POSTGRES_PASSWORD, POSTGRES_PORT).
 */
import * as fs from 'fs';
import * as path from 'path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

import type {
  NewCurrencyRatesRow,
  NewCurrencyStatisticsRow,
  NewHiveEngineRatesRow,
  OdlDatabase,
} from '../../../libs/core/src/db';
import {
  FIAT_RATE_BASE_USD,
  USD_PAIR_TO_COLUMN,
  ZERO_FIAT_ROW,
} from '../../../libs/currency/src/lib/currency.constants';
import { resolveConnectionString } from '../../../libs/migrations/src/connection';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import streamArray from 'stream-json/streamers/stream-array.js';

const BATCH = 500;
const PG_UNIQUE_VIOLATION = '23505';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function num(x: unknown): number {
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : 0;
}

function toDate(v: unknown): Date {
  if (v instanceof Date && !Number.isNaN(v.valueOf())) {
    return v;
  }
  const d = new Date(String(v));
  return Number.isNaN(d.valueOf()) ? new Date() : d;
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mapToken(b: unknown): {
  usd: number;
  usd_24h_change: number;
  btc: number;
  btc_24h_change: number;
} {
  if (!b || typeof b !== 'object') {
    return { usd: 0, usd_24h_change: 0, btc: 0, btc_24h_change: 0 };
  }
  const o = b as Record<string, unknown>;
  return {
    usd: num(o.usd),
    usd_24h_change: num(o.usd_24h_change),
    btc: num(o.btc),
    btc_24h_change: num(o.btc_24h_change),
  };
}

function mongoStatToRow(
  d: Record<string, unknown>,
): Omit<NewCurrencyStatisticsRow, 'id'> | null {
  const hive = mapToken(d.hive);
  const hbd = mapToken(d.hive_dollar ?? d.hive_Dollar);
  const t = String(d.type ?? '');
  const isDaily =
    Boolean(d.is_daily) ||
    Boolean(d.isDaily) ||
    t.toLowerCase().includes('daily');
  const ts = toDate(d.createdAt ?? d.updatedAt ?? d.created_at);
  return {
    is_daily: isDaily,
    hive_usd: hive.usd,
    hive_usd_24h_change: hive.usd_24h_change,
    hive_btc: hive.btc,
    hive_btc_24h_change: hive.btc_24h_change,
    hbd_usd: hbd.usd,
    hbd_usd_24h_change: hbd.usd_24h_change,
    hbd_btc: hbd.btc,
    hbd_btc_24h_change: hbd.btc_24h_change,
    created_at: ts,
  };
}

function mongoEngineToRow(
  d: Record<string, unknown>,
): Omit<NewHiveEngineRatesRow, 'id'> | null {
  const base = String(d.base ?? d.baseToken ?? 'WAIV').trim() || 'WAIV';
  const isDaily =
    Boolean(d.is_daily) || Boolean(d.isDaily) || String(d.period ?? '') === 'daily';

  const dt = d.date ?? d.day ?? d.ymd;
  const dateStr =
    typeof dt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dt) ?
      dt.slice(0, 10)
    : ymd(toDate(dt));

  const rateHive = num(d.rate_hive ?? d.rateHive ?? d.hive);
  const rateUsd = num(d.rate_usd ?? d.rateUsd ?? d.usd);

  if (!(rateHive > 0) && !(rateUsd > 0)) {
    return null;
  }

  const ch = d.change_24h_hive ?? d.change24hHive;
  const cu = d.change_24h_usd ?? d.change24hUsd;
  return {
    base,
    is_daily: isDaily,
    date: dateStr,
    rate_hive: rateHive,
    rate_usd: rateUsd,
    change_24h_hive:
      ch === undefined || ch === null ? null : (Number.isFinite(Number(ch)) ? Number(ch) : null),
    change_24h_usd:
      cu === undefined || cu === null ? null : (Number.isFinite(Number(cu)) ? Number(cu) : null),
    created_at: toDate(d.createdAt ?? d.updatedAt ?? d.created_at),
  };
}

function mongoFiatToRow(
  d: Record<string, unknown>,
): Omit<NewCurrencyRatesRow, 'id'> | null {
  const base =
    String(d.base ?? FIAT_RATE_BASE_USD).toUpperCase() || FIAT_RATE_BASE_USD;
  const dt = d.date ?? d.day;
  const dateStr =
    typeof dt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dt) ?
      dt.slice(0, 10)
    : ymd(toDate(dt ?? new Date()));

  const out: Omit<NewCurrencyRatesRow, 'id'> = {
    base,
    date: dateStr,
    ...ZERO_FIAT_ROW,
    created_at: toDate(d.createdAt ?? d.updatedAt ?? new Date()),
  };

  const quotes = d.quotes && typeof d.quotes === 'object' ? d.quotes : null;
  const src: Record<string, unknown> =
    quotes ?? (typeof d === 'object' ? d : {});

  for (const [k, col] of Object.entries(USD_PAIR_TO_COLUMN)) {
    const mongoKeyLc = k.toLowerCase();
    const alt = mongoKeyLc.replace(/^usd/, '').toUpperCase();
    let raw =
      src[k] ?? src[mongoKeyLc] ?? src[alt.toLowerCase()] ?? src[alt];

    const colName = col as keyof typeof ZERO_FIAT_ROW;

    raw ??=
      quotes && typeof quotes === 'object' ?
        (quotes as Record<string, unknown>)[k]
      : undefined;

    if (typeof raw !== 'undefined' && raw !== null) {
      out[colName] = num(raw);
    }
  }

  return out;
}

async function flushStats(
  dbK: Kysely<OdlDatabase>,
  buf: Omit<NewCurrencyStatisticsRow, 'id'>[],
  dryRun: boolean,
): Promise<number> {
  let dup = 0;
  if (buf.length === 0 || dryRun) {
    return dup;
  }
  for (const row of buf) {
    try {
      await dbK.insertInto('currency_statistics').values(row).execute();
    } catch (e) {
      if ((e as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        dup++;
        continue;
      }
      throw e;
    }
  }
  return dup;
}

async function flushEngine(
  dbK: Kysely<OdlDatabase>,
  buf: Omit<NewHiveEngineRatesRow, 'id'>[],
  dryRun: boolean,
): Promise<number> {
  let dup = 0;
  if (buf.length === 0 || dryRun) {
    return dup;
  }
  for (const row of buf) {
    try {
      await dbK.insertInto('hive_engine_rates').values(row).execute();
    } catch (e) {
      if ((e as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        dup++;
        continue;
      }
      throw e;
    }
  }
  return dup;
}

async function flushFiat(
  dbK: Kysely<OdlDatabase>,
  buf: Omit<NewCurrencyRatesRow, 'id'>[],
  dryRun: boolean,
): Promise<void> {
  if (buf.length === 0 || dryRun) {
    return;
  }
  for (const row of buf) {
    await dbK
      .insertInto('currency_rates')
      .values(row)
      .onConflict((oc) =>
        oc.columns(['base', 'date']).doUpdateSet({
          cad: row.cad,
          eur: row.eur,
          aud: row.aud,
          mxn: row.mxn,
          gbp: row.gbp,
          jpy: row.jpy,
          cny: row.cny,
          rub: row.rub,
          uah: row.uah,
          chf: row.chf,
        }),
      )
      .execute();
  }
}

async function streamArrayIntoSink(
  filePath: string,
  sink: Writable,
): Promise<void> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    fail(`File not found: ${resolved}`);
  }
  await streamPipeline(
    fs.createReadStream(resolved, { encoding: 'utf8' }),
    streamArray.withParserAsStream(),
    sink,
  );
}

type ParsedCli = {
  dryRun: boolean;
  only: Set<string>;
  statsPath?: string;
  enginePath?: string;
  fiatPath?: string;
};

function parseArgs(argv: string[]): ParsedCli {
  const dryRun = argv.includes('--dry-run');
  const only = new Set<string>();
  let statsPath: string | undefined;
  let enginePath: string | undefined;
  let fiatPath: string | undefined;

  for (const a of argv) {
    if (a.startsWith('--only=')) {
      for (const x of a.slice('--only='.length).split(',')) {
        const t = x.trim();
        if (t) {
          only.add(t);
        }
      }
    } else if (a.startsWith('--stats=')) {
      statsPath = a.slice('--stats='.length).trim();
    } else if (a.startsWith('--engine=')) {
      enginePath = a.slice('--engine='.length).trim();
    } else if (a.startsWith('--fiat=')) {
      fiatPath = a.slice('--fiat='.length).trim();
    }
  }

  const positionals = argv.filter((a) => !a.startsWith('--'));
  let pi = 0;
  if (!statsPath && positionals[pi]) {
    statsPath = positionals[pi];
    pi++;
  }
  if (!enginePath && positionals[pi]) {
    enginePath = positionals[pi];
    pi++;
  }
  if (!fiatPath && positionals[pi]) {
    fiatPath = positionals[pi];
    pi++;
  }

  return { dryRun, only, statsPath, enginePath, fiatPath };
}

function wantBucket(only: Set<string>, name: string): boolean {
  return only.size === 0 || only.has(name);
}

async function migrateOneFile(
  label: string,
  filePath: string,
  sinkFactory: () => Writable,
): Promise<void> {
  console.log(`${label}: streaming ${path.resolve(filePath)}`);
  await streamArrayIntoSink(filePath, sinkFactory());
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (
    !(parsed.statsPath?.trim()) &&
    !(parsed.enginePath?.trim()) &&
    !(parsed.fiatPath?.trim())
  ) {
    fail(
      'Usage: pnpm migrate:mongo-currency [--dry-run] [--only=stats,engine,fiat] [--stats=file.json] [--engine=file.json] [--fiat=file.json]\n' +
        'Or pass up to three positional paths: stats-export.json [engine-export.json] [fiat-export.json]',
    );
  }

  const conn = resolveConnectionString();
  const pool = new Pool({ connectionString: conn });
  const dbK = new Kysely<OdlDatabase>({
    dialect: new PostgresDialect({ pool }),
  });

  try {
    if (wantBucket(parsed.only, 'stats') && parsed.statsPath?.trim()) {
      let seen = 0;
      let buf: Omit<NewCurrencyStatisticsRow, 'id'>[] = [];
      let dupTotal = 0;
      await migrateOneFile('stats', parsed.statsPath, () =>
        new Writable({
          objectMode: true,
          write(
            item: { key: number; value: unknown },
            _encoding: BufferEncoding,
            callback: (err?: Error | null) => void,
          ) {
            void (async () => {
              try {
                seen++;
                if (
                  item.value !== null &&
                  typeof item.value === 'object' &&
                  !Array.isArray(item.value)
                ) {
                  const row = mongoStatToRow(
                    item.value as Record<string, unknown>,
                  );
                  if (row) {
                    buf.push(row);
                  }
                }
                if (buf.length >= BATCH) {
                  dupTotal += await flushStats(dbK, buf, parsed.dryRun);
                  buf = [];
                }
                if (seen % 10_000 === 0) {
                  console.log(`  stats ... ${seen} array elements`);
                }
                callback();
              } catch (e) {
                callback(e instanceof Error ? e : new Error(String(e)));
              }
            })();
          },
        }),
      );
      dupTotal += await flushStats(dbK, buf, parsed.dryRun);
      console.log(
        `stats: done (${seen} elements, Postgres dup-skip=${dupTotal})`,
      );
    }

    if (wantBucket(parsed.only, 'engine') && parsed.enginePath?.trim()) {
      let seen = 0;
      let buf: Omit<NewHiveEngineRatesRow, 'id'>[] = [];
      let dupTotal = 0;
      await migrateOneFile('engine', parsed.enginePath, () =>
        new Writable({
          objectMode: true,
          write(
            item: { key: number; value: unknown },
            _encoding: BufferEncoding,
            callback: (err?: Error | null) => void,
          ) {
            void (async () => {
              try {
                seen++;
                if (
                  item.value !== null &&
                  typeof item.value === 'object' &&
                  !Array.isArray(item.value)
                ) {
                  const row = mongoEngineToRow(
                    item.value as Record<string, unknown>,
                  );
                  if (row) {
                    buf.push(row);
                  }
                }
                if (buf.length >= BATCH) {
                  dupTotal += await flushEngine(dbK, buf, parsed.dryRun);
                  buf = [];
                }
                if (seen % 10_000 === 0) {
                  console.log(`  engine ... ${seen} array elements`);
                }
                callback();
              } catch (e) {
                callback(e instanceof Error ? e : new Error(String(e)));
              }
            })();
          },
        }),
      );
      dupTotal += await flushEngine(dbK, buf, parsed.dryRun);
      console.log(
        `engine: done (${seen} elements, Postgres dup-skip=${dupTotal})`,
      );
    }

    if (wantBucket(parsed.only, 'fiat') && parsed.fiatPath?.trim()) {
      let seen = 0;
      let buf: Omit<NewCurrencyRatesRow, 'id'>[] = [];
      await migrateOneFile('fiat', parsed.fiatPath, () =>
        new Writable({
          objectMode: true,
          write(
            item: { key: number; value: unknown },
            _encoding: BufferEncoding,
            callback: (err?: Error | null) => void,
          ) {
            void (async () => {
              try {
                seen++;
                if (
                  item.value !== null &&
                  typeof item.value === 'object' &&
                  !Array.isArray(item.value)
                ) {
                  const row = mongoFiatToRow(
                    item.value as Record<string, unknown>,
                  );
                  if (row) {
                    buf.push(row);
                  }
                }
                if (buf.length >= BATCH) {
                  await flushFiat(dbK, buf, parsed.dryRun);
                  buf = [];
                }
                if (seen % 10_000 === 0) {
                  console.log(`  fiat ... ${seen} array elements`);
                }
                callback();
              } catch (e) {
                callback(e instanceof Error ? e : new Error(String(e)));
              }
            })();
          },
        }),
      );
      await flushFiat(dbK, buf, parsed.dryRun);
      console.log(`fiat: done (${seen} elements)`);
    }

    if (parsed.dryRun) {
      console.log('Dry-run: no writes were persisted.');
    }
  } finally {
    await dbK.destroy();
  }
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
