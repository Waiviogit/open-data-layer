/**
 * Stream MongoDB Subscriptions JSON array export into `user_subscriptions`.
 * Usage: pnpm migrate:mongo-subscriptions <path-to-subscriptions.json>
 */

import * as fs from 'fs';
import * as path from 'path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

import type { NewUserSubscription, OdlDatabase } from '../../../libs/core/src/db';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import streamArray from 'stream-json/streamers/stream-array.js';

import type { MongoSubscription } from './types';

const BATCH_SIZE = 5000;

interface MigrationStats {
  rowsSeen: number;
  rowsSkippedMissingPk: number;
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
    this.buffer.push({
      follower,
      following,
      bell: doc.bell ?? null,
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

async function migrateFile(filePath: string): Promise<void> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    fail(`File not found: ${resolved}`);
  }

  const databaseUrl = process.env['DATABASE_URL']?.trim();
  if (!databaseUrl) {
    fail('DATABASE_URL is required. Set it in the environment or .env.');
  }

  const migrator = new MongoSubscriptionsMigrator(databaseUrl);

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
    await migrator.destroy();
  }

  console.log('Migration finished. Stats:', migrator.stats);
}

function main(): void {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => !a.startsWith('--'));

  if (!fileArg?.trim()) {
    fail(
      'Usage: tsx scripts/migrate-mongo-to-pg/subscriptions/index.ts <path-to-subscriptions.json>',
    );
  }

  migrateFile(fileArg).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}

main();
