/**
 * Stream MongoDB WobjectSubscriptions JSON array export into `user_object_follows`.
 * Usage: pnpm migrate:mongo-wobject-subscriptions <path-to-wobject-subscriptions.json> [--skip-indexes]
 *
 * Mapping: `follower` → account, `following` → object_id, `bell` → bell,
 * `created_at` from document `_id` (ObjectId timestamp).
 *
 * Skips rows where `follower` (account) contains `_`. Does not filter `following`
 * by underscore (it is an object id/permlink, not a Hive name).
 *
 * Inserts only when `account` exists in `accounts_current` and `object_id` in
 * `objects_core` (run users + objects migrations first, or load accounts/objects).
 *
 * --skip-indexes  Drop secondary indexes on `user_object_follows` before bulk insert;
 *                 recreate after.
 */

import * as fs from 'fs';
import * as path from 'path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

import { resolveConnectionString } from '../../../libs/migrations/src/connection';
import type { NewUserObjectFollow, OdlDatabase } from '../../../libs/core/src/db';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import streamArray from 'stream-json/streamers/stream-array.js';

import { dateFromMongoObjectIdHex, mongoOidHex } from '../mongo-object-id-date';
import type { MongoWobjectSubscription } from './types';

const BATCH_SIZE = 5000;

interface MigrationStats {
  rowsSeen: number;
  rowsSkippedMissingPk: number;
  rowsSkippedUnderscoreInAccount: number;
  rowsSkippedNoAccountFk: number;
  rowsSkippedNoObjectFk: number;
  rowsBuffered: number;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

class MongoWobjectSubscriptionsMigrator {
  readonly db: Kysely<OdlDatabase>;

  private buffer: NewUserObjectFollow[] = [];

  readonly stats: MigrationStats = {
    rowsSeen: 0,
    rowsSkippedMissingPk: 0,
    rowsSkippedUnderscoreInAccount: 0,
    rowsSkippedNoAccountFk: 0,
    rowsSkippedNoObjectFk: 0,
    rowsBuffered: 0,
  };

  constructor(connectionString: string) {
    const pool = new Pool({ connectionString });
    this.db = new Kysely<OdlDatabase>({
      dialect: new PostgresDialect({ pool }),
    });
  }

  async destroy(): Promise<void> {
    await this.db.destroy();
  }

  private async resolveExistingObjectIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    const unique = [...new Set(ids)];
    const rows = await this.db
      .selectFrom('objects_core')
      .select('object_id')
      .where('object_id', 'in', unique)
      .execute();
    return new Set(rows.map((r) => r.object_id));
  }

  private async resolveExistingAccounts(names: string[]): Promise<Set<string>> {
    if (names.length === 0) {
      return new Set();
    }
    const unique = [...new Set(names)];
    const rows = await this.db
      .selectFrom('accounts_current')
      .select('name')
      .where('name', 'in', unique)
      .execute();
    return new Set(rows.map((r) => r.name));
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }
    const chunk = this.buffer;
    this.buffer = [];
    const objectIds = chunk.map((r) => r.object_id);
    const accounts = chunk.map((r) => r.account);
    const existingObjects = await this.resolveExistingObjectIds(objectIds);
    const existingAccounts = await this.resolveExistingAccounts(accounts);

    const filtered: NewUserObjectFollow[] = [];
    for (const row of chunk) {
      if (!existingAccounts.has(row.account)) {
        this.stats.rowsSkippedNoAccountFk += 1;
        continue;
      }
      if (!existingObjects.has(row.object_id)) {
        this.stats.rowsSkippedNoObjectFk += 1;
        continue;
      }
      filtered.push(row);
    }

    if (filtered.length === 0) {
      return;
    }

    await this.db
      .insertInto('user_object_follows')
      .values(filtered)
      .onConflict((oc) => oc.columns(['account', 'object_id']).doNothing())
      .execute();
  }

  processRow(doc: MongoWobjectSubscription): void {
    this.stats.rowsSeen += 1;
    const account = doc.follower?.trim();
    const object_id = doc.following?.trim();
    if (!account || !object_id) {
      this.stats.rowsSkippedMissingPk += 1;
      return;
    }
    if (account.includes('_')) {
      this.stats.rowsSkippedUnderscoreInAccount += 1;
      return;
    }
    const created_at =
      dateFromMongoObjectIdHex(mongoOidHex(doc._id)) ?? new Date(0);
    this.buffer.push({
      account,
      object_id,
      bell: doc.bell ?? false,
      created_at,
    });
    this.stats.rowsBuffered += 1;
  }

  async flushIfNeeded(): Promise<void> {
    if (this.buffer.length >= BATCH_SIZE) {
      await this.flush();
    }
  }

  async flushAll(): Promise<void> {
    await this.flush();
  }
}

async function dropWobjectFollowBulkIndexes(db: Kysely<OdlDatabase>): Promise<void> {
  console.log('Dropping user_object_follows indexes...');
  await sql`DROP INDEX IF EXISTS idx_user_object_follows_account_created_at`.execute(
    db,
  );
  await sql`DROP INDEX IF EXISTS idx_user_object_follows_object_id`.execute(db);
  console.log('Indexes dropped.');
}

async function recreateWobjectFollowBulkIndexes(
  db: Kysely<OdlDatabase>,
): Promise<void> {
  console.log('Recreating user_object_follows indexes...');
  await sql`CREATE INDEX idx_user_object_follows_object_id ON user_object_follows (object_id)`.execute(
    db,
  );
  await sql`
    CREATE INDEX idx_user_object_follows_account_created_at
    ON user_object_follows (account, created_at DESC)
  `.execute(db);
  console.log('Indexes recreated.');
}

async function migrateFile(filePath: string, skipIndexes: boolean): Promise<void> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    fail(`File not found: ${resolved}`);
  }

  const databaseUrl = resolveConnectionString();

  const migrator = new MongoWobjectSubscriptionsMigrator(databaseUrl);

  if (skipIndexes) {
    await dropWobjectFollowBulkIndexes(migrator.db);
  }

  try {
    const sink = new Writable({
      objectMode: true,
      write(
        item: { key: number; value: MongoWobjectSubscription },
        _encoding: BufferEncoding,
        callback: (err?: Error | null) => void,
      ) {
        migrator.processRow(item.value);
        migrator
          .flushIfNeeded()
          .then(() => {
            if ((item.key + 1) % 10000 === 0) {
              console.log(`Processed ${item.key + 1} wobject subscription rows...`);
            }
            callback();
          })
          .catch((err: unknown) =>
            callback(err instanceof Error ? err : new Error(String(err))),
          );
      },
    });

    await streamPipeline(
      fs.createReadStream(resolved, { encoding: 'utf8' }),
      streamArray.withParserAsStream(),
      sink,
    );

    await migrator.flushAll();
  } finally {
    if (skipIndexes) {
      await recreateWobjectFollowBulkIndexes(migrator.db);
    }
    await migrator.destroy();
  }

  console.log('Migration finished. Stats:', migrator.stats);
}

function main(): void {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => !a.startsWith('--'));
  const skipIndexes = args.includes('--skip-indexes');

  if (!fileArg?.trim()) {
    fail(
      'Usage: tsx scripts/migrate-mongo-to-pg/wobject-subscriptions/index.ts <path-to-export.json> [--skip-indexes]',
    );
  }

  migrateFile(fileArg, skipIndexes).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}

main();
