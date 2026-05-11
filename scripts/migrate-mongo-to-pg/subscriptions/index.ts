/**
 * Stream MongoDB Subscriptions JSON array export into `user_subscriptions`.
 * Usage: pnpm migrate:mongo-subscriptions <path-to-subscriptions.json> [--skip-indexes]
 *
 * Skips pairs where `follower` or `following` contains `_`.
 *
 * --skip-indexes  Drop secondary indexes on `user_subscriptions` before bulk insert;
 *                 recreate after.
 */

import * as fs from 'fs';
import * as path from 'path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

import { resolveConnectionString } from '../../../libs/migrations/src/connection';
import type { NewUserSubscription, OdlDatabase } from '../../../libs/core/src/db';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import streamArray from 'stream-json/streamers/stream-array.js';

import { dateFromMongoObjectIdHex, mongoOidHex } from '../mongo-object-id-date';
import type { MongoSubscription } from './types';

const BATCH_SIZE = 5000;

interface MigrationStats {
  rowsSeen: number;
  rowsSkippedMissingPk: number;
  rowsSkippedUnderscoreInAccount: number;
  rowsBuffered: number;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

class MongoSubscriptionsMigrator {
  readonly db: Kysely<OdlDatabase>;

  private buffer: NewUserSubscription[] = [];

  readonly stats: MigrationStats = {
    rowsSeen: 0,
    rowsSkippedMissingPk: 0,
    rowsSkippedUnderscoreInAccount: 0,
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

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }
    const chunk = this.buffer;
    this.buffer = [];
    await this.db
      .insertInto('user_subscriptions')
      .values(chunk)
      .onConflict((oc) => oc.columns(['follower', 'following']).doNothing())
      .execute();
  }

  processRow(doc: MongoSubscription): void {
    this.stats.rowsSeen += 1;
    const follower = doc.follower?.trim();
    const following = doc.following?.trim();
    if (!follower || !following) {
      this.stats.rowsSkippedMissingPk += 1;
      return;
    }
    if (follower.includes('_') || following.includes('_')) {
      this.stats.rowsSkippedUnderscoreInAccount += 1;
      return;
    }
    const createdAt =
      dateFromMongoObjectIdHex(mongoOidHex(doc._id)) ?? new Date(0);
    this.buffer.push({
      follower,
      following,
      bell: doc.bell ?? null,
      created_at: createdAt,
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

async function dropSubscriptionBulkIndexes(db: Kysely<OdlDatabase>): Promise<void> {
  console.log('Dropping user_subscriptions indexes...');
  await sql`DROP INDEX IF EXISTS idx_user_subscriptions_follower_created_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_user_subscriptions_following_created_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_user_subscriptions_following`.execute(db);
  console.log('Indexes dropped.');
}

async function recreateSubscriptionBulkIndexes(db: Kysely<OdlDatabase>): Promise<void> {
  console.log('Recreating user_subscriptions indexes...');
  await sql`CREATE INDEX idx_user_subscriptions_following ON user_subscriptions (following)`.execute(db);
  await sql`
    CREATE INDEX idx_user_subscriptions_following_created_at
    ON user_subscriptions (following, created_at DESC)
  `.execute(db);
  await sql`
    CREATE INDEX idx_user_subscriptions_follower_created_at
    ON user_subscriptions (follower, created_at DESC)
  `.execute(db);
  console.log('Indexes recreated.');
}

async function migrateFile(filePath: string, skipIndexes: boolean): Promise<void> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    fail(`File not found: ${resolved}`);
  }

  const databaseUrl = resolveConnectionString();

  const migrator = new MongoSubscriptionsMigrator(databaseUrl);

  if (skipIndexes) {
    await dropSubscriptionBulkIndexes(migrator.db);
  }

  try {
    const sink = new Writable({
      objectMode: true,
      write(
        item: { key: number; value: MongoSubscription },
        _encoding: BufferEncoding,
        callback: (err?: Error | null) => void,
      ) {
        migrator.processRow(item.value);
        migrator
          .flushIfNeeded()
          .then(() => {
            if ((item.key + 1) % 10000 === 0) {
              console.log(`Processed ${item.key + 1} subscriptions...`);
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
      await recreateSubscriptionBulkIndexes(migrator.db);
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
      'Usage: tsx scripts/migrate-mongo-to-pg/subscriptions/index.ts <path-to-subscriptions.json> [--skip-indexes]',
    );
  }

  migrateFile(fileArg, skipIndexes).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}

main();
