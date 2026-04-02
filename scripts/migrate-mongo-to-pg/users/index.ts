/**
 * Stream MongoDB User JSON array export into ODL `accounts_current` (Waivio columns) and user_* tables.
 * Usage: pnpm migrate:mongo-users <path-to-users.json>
 */

import * as fs from 'fs';
import * as path from 'path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

import type {
  JsonValue,
  NewAccountCurrent,
  NewUserMetadata,
  NewUserNotificationSettings,
  NewUserObjectFollow,
  NewUserPostBookmark,
  NewUserReferral,
  OdlDatabase,
} from '../../../libs/core/src/db';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import streamArray from 'stream-json/streamers/stream-array.js';

import type { MongoDate, MongoUser } from './types';

const BATCH_SIZE = 5000;

const REWARD_SETTINGS = new Set(['HP', '50', 'HIVE']);

type UserMetadataInsert = Omit<NewUserMetadata, 'post_locales'> & {
  postLocalesData: JsonValue;
};

interface MigrationStats {
  usersSeen: number;
  usersSkippedMissingName: number;
  objectFollowsSkippedNoFk: number;
  bookmarksSkippedNoPostRef: number;
  accountRowsBuffered: number;
  metadataRowsBuffered: number;
  notificationRowsBuffered: number;
  referralRowsBuffered: number;
  bookmarkRowsBuffered: number;
  objectFollowRowsBuffered: number;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseMongoDate(u: unknown): number | null {
  if (u instanceof Date) {
    return Math.floor(u.getTime() / 1000);
  }
  if (typeof u === 'string') {
    const t = Date.parse(u);
    if (!Number.isNaN(t)) {
      return Math.floor(t / 1000);
    }
    return null;
  }
  if (u && typeof u === 'object' && '$date' in (u as object)) {
    const d = (u as MongoDate).$date;
    if (typeof d === 'number') {
      return Math.floor(d / 1000);
    }
    const t = Date.parse(String(d));
    if (!Number.isNaN(t)) {
      return Math.floor(t / 1000);
    }
  }
  return null;
}

function updatedAtUnix(doc: MongoUser): number | null {
  return parseMongoDate(doc.updatedAt);
}

function lastActivityUnix(doc: MongoUser): number | null {
  return parseMongoDate(doc.lastActivity);
}

function splitPostBookmark(raw: string): { author: string; permlink: string } | null {
  const t = raw.trim();
  const i = t.indexOf('/');
  if (i <= 0) {
    return null;
  }
  const author = t.slice(0, i).trim();
  const permlink = t.slice(i + 1).trim();
  if (!author || !permlink) {
    return null;
  }
  return { author, permlink };
}

class MongoUsersMigrator {
  readonly db: Kysely<OdlDatabase>;

  private accountBuffer: NewAccountCurrent[] = [];

  private metadataBuffer: UserMetadataInsert[] = [];

  private notificationBuffer: NewUserNotificationSettings[] = [];

  private referralBuffer: NewUserReferral[] = [];

  private bookmarkBuffer: NewUserPostBookmark[] = [];

  private objectFollowBuffer: NewUserObjectFollow[] = [];

  readonly stats: MigrationStats = {
    usersSeen: 0,
    usersSkippedMissingName: 0,
    objectFollowsSkippedNoFk: 0,
    bookmarksSkippedNoPostRef: 0,
    accountRowsBuffered: 0,
    metadataRowsBuffered: 0,
    notificationRowsBuffered: 0,
    referralRowsBuffered: 0,
    bookmarkRowsBuffered: 0,
    objectFollowRowsBuffered: 0,
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

  private async flushAccounts(): Promise<void> {
    if (this.accountBuffer.length === 0) {
      return;
    }
    const chunk = this.accountBuffer;
    this.accountBuffer = [];
    await this.db
      .insertInto('accounts_current')
      .values(chunk)
      .onConflict((oc) => oc.column('name').doNothing())
      .execute();
  }

  private async flushMetadata(): Promise<void> {
    if (this.metadataBuffer.length === 0) {
      return;
    }
    const chunk = this.metadataBuffer;
    this.metadataBuffer = [];
    const rows = chunk.map((row) => {
      const { postLocalesData, ...rest } = row;
      return {
        ...rest,
        post_locales: sql`${JSON.stringify(postLocalesData ?? [])}::jsonb`,
      };
    });
    await this.db
      .insertInto('user_metadata')
      .values(rows as unknown as NewUserMetadata[])
      .onConflict((oc) => oc.column('account').doNothing())
      .execute();
  }

  private async flushNotifications(): Promise<void> {
    if (this.notificationBuffer.length === 0) {
      return;
    }
    const chunk = this.notificationBuffer;
    this.notificationBuffer = [];
    await this.db
      .insertInto('user_notification_settings')
      .values(chunk)
      .onConflict((oc) => oc.column('account').doNothing())
      .execute();
  }

  private async flushReferrals(): Promise<void> {
    if (this.referralBuffer.length === 0) {
      return;
    }
    const chunk = this.referralBuffer;
    this.referralBuffer = [];
    await this.db
      .insertInto('user_referrals')
      .values(chunk)
      .onConflict((oc) => oc.columns(['account', 'agent', 'type']).doNothing())
      .execute();
  }

  private async flushBookmarks(): Promise<void> {
    if (this.bookmarkBuffer.length === 0) {
      return;
    }
    const chunk = this.bookmarkBuffer;
    this.bookmarkBuffer = [];
    await this.db
      .insertInto('user_post_bookmarks')
      .values(chunk)
      .onConflict((oc) => oc.columns(['account', 'author', 'permlink']).doNothing())
      .execute();
  }

  private async flushObjectFollows(): Promise<void> {
    if (this.objectFollowBuffer.length === 0) {
      return;
    }
    const chunk = this.objectFollowBuffer;
    this.objectFollowBuffer = [];
    const ids = chunk.map((r) => r.object_id);
    const existing = await this.resolveExistingObjectIds(ids);
    const filtered: NewUserObjectFollow[] = [];
    for (const row of chunk) {
      if (existing.has(row.object_id)) {
        filtered.push(row);
      } else {
        this.stats.objectFollowsSkippedNoFk += 1;
      }
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

  async flushAll(): Promise<void> {
    await this.flushAccounts();
    await this.flushMetadata();
    await this.flushNotifications();
    await this.flushReferrals();
    await this.flushBookmarks();
    await this.flushObjectFollows();
  }

  async flushIfNeeded(): Promise<void> {
    if (
      this.accountBuffer.length >= BATCH_SIZE ||
      this.metadataBuffer.length >= BATCH_SIZE ||
      this.notificationBuffer.length >= BATCH_SIZE ||
      this.referralBuffer.length >= BATCH_SIZE ||
      this.bookmarkBuffer.length >= BATCH_SIZE ||
      this.objectFollowBuffer.length >= BATCH_SIZE
    ) {
      await this.flushAll();
    }
  }

  processUser(doc: MongoUser): void {
    this.stats.usersSeen += 1;
    const name = doc.name?.trim();
    if (!name) {
      this.stats.usersSkippedMissingName += 1;
      return;
    }

    const um = doc.user_metadata;
    const settings = um?.settings;
    const un = settings?.userNotifications;

    const rewardRaw = settings?.rewardSetting?.trim();
    const reward_setting =
      rewardRaw && REWARD_SETTINGS.has(rewardRaw)
        ? (rewardRaw as NewUserMetadata['reward_setting'])
        : '50';

    const postLocalesData: JsonValue = Array.isArray(settings?.postLocales)
      ? (settings!.postLocales as JsonValue)
      : [];

    this.accountBuffer.push({
      name,
      hive_id: null,
      json_metadata: doc.json_metadata?.trim() ?? null,
      posting_json_metadata: doc.posting_json_metadata?.trim() ?? null,
      created: null,
      comment_count: 0,
      lifetime_vote_count: 0,
      post_count: doc.count_posts ?? 0,
      last_post: null,
      last_root_post: doc.last_root_post?.trim() ?? null,
      object_reputation: 0,
      updated_at_unix: updatedAtUnix(doc),
      alias: doc.alias?.trim() ?? null,
      profile_image: doc.profile_image?.trim() ?? null,
      wobjects_weight: doc.wobjects_weight ?? 0,
      last_posts_count: doc.last_posts_count ?? 0,
      users_following_count: doc.users_following_count ?? 0,
      followers_count: doc.followers_count ?? 0,
      stage_version: doc.stage_version ?? 0,
      referral_status: doc.referralStatus?.trim() ?? null,
      last_activity: lastActivityUnix(doc),
    });
    this.stats.accountRowsBuffered += 1;

    this.metadataBuffer.push({
      account: name,
      notifications_last_timestamp: um?.notifications_last_timestamp ?? 0,
      exit_page_setting: settings?.exitPageSetting ?? true,
      locale: settings?.locale?.trim() || 'en-US',
      postLocalesData,
      nightmode: settings?.nightmode ?? false,
      reward_setting,
      rewrite_links: settings?.rewriteLinks ?? false,
      show_nsfw_posts: settings?.showNSFWPosts ?? false,
      upvote_setting: settings?.upvoteSetting ?? false,
      vote_percent: settings?.votePercent ?? 5000,
      voting_power: settings?.votingPower ?? true,
      currency: settings?.currency?.trim() ?? null,
    });
    this.stats.metadataRowsBuffered += 1;

    this.notificationBuffer.push({
      account: name,
      activation_campaign: un?.activationCampaign ?? true,
      deactivation_campaign: un?.deactivationCampaign ?? true,
      follow: un?.follow ?? true,
      fill_order: un?.fillOrder ?? true,
      mention: un?.mention ?? true,
      minimal_transfer: un?.minimalTransfer ?? 0,
      reblog: un?.reblog ?? true,
      reply: un?.reply ?? true,
      status_change: un?.statusChange ?? true,
      transfer: un?.transfer ?? true,
      power_up: un?.powerUp ?? true,
      witness_vote: un?.witness_vote ?? true,
      my_post: un?.myPost ?? false,
      my_comment: un?.myComment ?? false,
      my_like: un?.myLike ?? false,
      vote: un?.like ?? true,
      downvote: un?.downvote ?? false,
      claim_reward: un?.claimReward ?? false,
    });
    this.stats.notificationRowsBuffered += 1;

    for (const r of doc.referral ?? []) {
      const agent = r.agent?.trim();
      const type = r.type?.trim();
      if (!agent || !type) {
        continue;
      }
      this.referralBuffer.push({
        account: name,
        agent,
        type,
        started_at: parseMongoDate(r.startedAt),
        ended_at: parseMongoDate(r.endedAt),
      });
      this.stats.referralRowsBuffered += 1;
    }

    for (const b of um?.bookmarks ?? []) {
      if (typeof b !== 'string') {
        continue;
      }
      const split = splitPostBookmark(b);
      if (!split) {
        this.stats.bookmarksSkippedNoPostRef += 1;
        continue;
      }
      this.bookmarkBuffer.push({
        account: name,
        author: split.author,
        permlink: split.permlink,
      });
      this.stats.bookmarkRowsBuffered += 1;
    }

    for (const oid of doc.objects_follow ?? []) {
      const object_id = oid?.trim();
      if (!object_id) {
        continue;
      }
      this.objectFollowBuffer.push({
        account: name,
        object_id,
        bell: false,
      });
      this.stats.objectFollowRowsBuffered += 1;
    }
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

  const migrator = new MongoUsersMigrator(databaseUrl);

  try {
    const sink = new Writable({
      objectMode: true,
      write(
        item: { key: number; value: MongoUser },
        _encoding: BufferEncoding,
        callback: (err?: Error | null) => void,
      ) {
        migrator.processUser(item.value);
        migrator
          .flushIfNeeded()
          .then(() => {
            if ((item.key + 1) % 1000 === 0) {
              console.log(`Processed ${item.key + 1} users...`);
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
    fail('Usage: tsx scripts/migrate-mongo-to-pg/users/index.ts <path-to-users.json>');
  }

  migrateFile(fileArg).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}

main();
