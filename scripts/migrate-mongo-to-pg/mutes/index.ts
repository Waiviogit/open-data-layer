/**
 * Stream MongoDB mute / ignore pairs JSON array export into `user_account_mutes`.
 * Usage: pnpm migrate:mongo-mutes <path-to-mutes.json>
 */

import * as fs from 'fs';
import * as path from 'path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

import type { NewUserAccountMute, OdlDatabase } from '../../../libs/core/src/db';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import streamArray from 'stream-json/streamers/stream-array.js';

import type { MongoMute } from './types';

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

function resolveMuterMuted(doc: MongoMute): { muter: string; muted: string } | null {
  const muter = (doc.mutedBy ?? doc.muter ?? doc.follower)?.trim();
  const muted = (doc.userName ?? doc.muted ?? doc.following)?.trim();
  if (!muter || !muted) {
    return null;
  }
  return { muter, muted };
}

class MongoMutesMigrator {
  readonly db: Kysely<OdlDatabase>;

  private buffer: NewUserAccountMute[] = [];

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
      .insertInto('user_account_mutes')
      .values(chunk)
      .onConflict((oc) => oc.columns(['muter', 'muted']).doNothing())
      .execute();
  }

  processRow(doc: MongoMute): void {
    this.stats.rowsSeen += 1;
    const pair = resolveMuterMuted(doc);
    if (!pair) {
      this.stats.rowsSkippedMissingPk += 1;
      return;
    }
    this.buffer.push(pair);
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

  const migrator = new MongoMutesMigrator(databaseUrl);

  try {
    const sink = new Writable({
      objectMode: true,
      write(
        item: { key: number; value: MongoMute },
        _encoding: BufferEncoding,
        callback: (err?: Error | null) => void,
      ) {
        migrator.processRow(item.value);
        migrator
          .flushIfNeeded()
          .then(() => {
            if ((item.key + 1) % 10000 === 0) {
              console.log(`Processed ${item.key + 1} mutes...`);
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
      'Usage: tsx scripts/migrate-mongo-to-pg/mutes/index.ts <path-to-mutes.json>',
    );
  }

  migrateFile(fileArg).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}

main();
