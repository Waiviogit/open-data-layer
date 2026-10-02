/**
 * Stream MongoDB post JSON array export into ODL Postgres `posts` and satellite tables.
 * Usage: pnpm migrate:mongo-posts <path-to-posts.json> [--skip-indexes]
 * Requires POSTGRES_HOST, POSTGRES_USER, POSTGRES_DATABASE (and optionally POSTGRES_PASSWORD, POSTGRES_PORT).
 *
 * Skips posts whose `author` contains `_`.
 *
 * --skip-indexes  Drop secondary indexes on `posts` and post_* satellites before bulk
 *                 insert; recreate after. Faster for large exports.
 */

import * as fs from 'fs';
import * as path from 'path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

import { resolveConnectionString } from '../../../libs/migrations/src/connection';
import type {
  JsonValue,
  NewPost,
  NewPostActiveVote,
  NewPostLanguage,
  NewPostLink,
  NewPostMention,
  NewPostObject,
  NewPostObjectRelatedImage,
  NewPostRebloggedUser,
  OdlDatabase,
} from '@opden-data-layer/odl-db-types';
import {
  bindPostObjectsToPost,
  parsePostObjectsForInsert,
} from '../../../libs/core/src/post-objects';
import {
  buildRelatedImageRows,
  extractPostImageUrls,
  isObjectTypeEligibleForRelatedAlbum,
} from '../../../libs/core/src/post-related-images';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import streamArray from 'stream-json/streamers/stream-array.js';

import { createdAtUnixFromObjectId, mongoIdToString } from '../objects/utils';
import {
  buildMongoPostMetadataRecord,
  objectTypeByIdFromLegacyWobjects,
  serializeMongoPostJsonMetadata,
} from './build-mongo-post-metadata';
import { deriveRewardsFinalizedAt } from '../../../libs/core/src/post-reward/derive-rewards-finalized-at';
import { normalizeMongoPostLanguage } from './normalize-post-language';
import type { MongoDate, MongoPost } from './types';
const BATCH_SIZE = 5000;

type PostInsertBuffer = Omit<NewPost, 'beneficiaries'> & {
  beneficiariesData: JsonValue;
};

interface RelatedImagePendingPost {
  author: string;
  permlink: string;
  jsonMetadata: string;
  objectRows: NewPostObject[];
}

interface MigrationStats {
  postsSeen: number;
  postsSkippedMissingPk: number;
  postsSkippedUnderscoreInAuthor: number;
  postsSkippedEmptyTitleBody: number;
  postObjectsSkippedNoFk: number;
  postRowsBuffered: number;
  voteRowsBuffered: number;
  objectRowsBuffered: number;
  reblogRowsBuffered: number;
  languageRowsBuffered: number;
  linkRowsBuffered: number;
  mentionRowsBuffered: number;
  relatedImageRowsBuffered: number;
  relatedImageRowsSkippedNoFk: number;
  relatedImageRowsSkippedNoImages: number;
  relatedImageRowsSkippedIneligibleType: number;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function toBigInt(n: unknown): bigint {
  if (n == null) {
    return 0n;
  }
  if (typeof n === 'bigint') {
    return n;
  }
  if (typeof n === 'number' && Number.isFinite(n)) {
    return BigInt(Math.trunc(n));
  }
  if (typeof n === 'string') {
    const s = n.trim();
    if (!s) {
      return 0n;
    }
    try {
      const intPart = s.split(/[.eE]/)[0] ?? s;
      return BigInt(intPart);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

function toBigIntOrNull(n: unknown): bigint | null {
  if (n == null || n === '') {
    return null;
  }
  return toBigInt(n);
}

/** Mongo exports may use fractional weights/percent or stringified decimals. */
function toFloatOrNull(v: unknown): number | null {
  if (v == null || v === '') {
    return null;
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string') {
    const n = Number.parseFloat(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
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

function parseCreatedUnix(doc: MongoPost): number {
  const created = doc.created?.trim();
  if (created) {
    const t = Date.parse(created);
    if (!Number.isNaN(t)) {
      return Math.floor(t / 1000);
    }
  }
  const fromCreatedAt = parseMongoDate(doc.createdAt);
  if (fromCreatedAt !== null) {
    return fromCreatedAt;
  }
  const fromUpdated = parseMongoDate(doc.updatedAt);
  if (fromUpdated !== null) {
    return fromUpdated;
  }
  const oid = mongoIdToString(doc._id);
  if (oid && oid.length >= 8) {
    return createdAtUnixFromObjectId(oid);
  }
  return 0;
}

function strOrEmpty(v: unknown, fallback = ''): string {
  if (v == null) {
    return fallback;
  }
  if (typeof v === 'string') {
    return v;
  }
  return String(v);
}

function strOrNull(v: unknown): string | null {
  if (v == null) {
    return null;
  }
  const s = typeof v === 'string' ? v : String(v);
  const t = s.trim();
  return t.length ? t : null;
}

class MongoPostsMigrator {
  readonly db: Kysely<OdlDatabase>;

  private postBuffer: PostInsertBuffer[] = [];

  private voteBuffer: NewPostActiveVote[] = [];

  private objectBuffer: NewPostObject[] = [];

  private reblogBuffer: NewPostRebloggedUser[] = [];

  private languageBuffer: NewPostLanguage[] = [];

  private linkBuffer: NewPostLink[] = [];

  private mentionBuffer: NewPostMention[] = [];

  private relatedImagePending: RelatedImagePendingPost[] = [];

  readonly stats: MigrationStats = {
    postsSeen: 0,
    postsSkippedMissingPk: 0,
    postsSkippedUnderscoreInAuthor: 0,
    postsSkippedEmptyTitleBody: 0,
    postObjectsSkippedNoFk: 0,
    postRowsBuffered: 0,
    voteRowsBuffered: 0,
    objectRowsBuffered: 0,
    reblogRowsBuffered: 0,
    languageRowsBuffered: 0,
    linkRowsBuffered: 0,
    mentionRowsBuffered: 0,
    relatedImageRowsBuffered: 0,
    relatedImageRowsSkippedNoFk: 0,
    relatedImageRowsSkippedNoImages: 0,
    relatedImageRowsSkippedIneligibleType: 0,
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

  private async resolveObjectsCoreByIds(
    ids: string[],
  ): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const unique = [...new Set(ids)];
    const rows = await this.db
      .selectFrom('objects_core')
      .select(['object_id', 'object_type'])
      .where('object_id', 'in', unique)
      .execute();
    return new Map(rows.map((r) => [r.object_id, r.object_type]));
  }

  private async flushPosts(): Promise<void> {
    if (this.postBuffer.length === 0) {
      return;
    }
    const chunk = this.postBuffer;
    this.postBuffer = [];
    const rows = chunk.map((row) => {
      const { beneficiariesData, ...rest } = row;
      return {
        ...rest,
        beneficiaries: sql`${JSON.stringify(beneficiariesData ?? [])}::jsonb`,
      };
    });
    await this.db
      .insertInto('posts')
      .values(rows as unknown as NewPost[])
      .onConflict((oc) => oc.columns(['author', 'permlink']).doNothing())
      .execute();
  }

  private async flushVotes(): Promise<void> {
    if (this.voteBuffer.length === 0) {
      return;
    }
    const chunk = this.voteBuffer;
    this.voteBuffer = [];
    await this.db
      .insertInto('post_active_votes')
      .values(chunk)
      .onConflict((oc) => oc.columns(['author', 'permlink', 'voter']).doNothing())
      .execute();
  }

  private async flushObjects(): Promise<void> {
    if (this.objectBuffer.length === 0) {
      return;
    }
    const chunk = this.objectBuffer;
    this.objectBuffer = [];
    const ids = chunk.map((r) => r.object_id);
    const coreById = await this.resolveObjectsCoreByIds(ids);
    const filtered: NewPostObject[] = [];
    for (const row of chunk) {
      const coreType = coreById.get(row.object_id);
      if (coreType !== undefined) {
        filtered.push({
          ...row,
          object_type: coreType ?? row.object_type ?? null,
        });
      } else {
        this.stats.postObjectsSkippedNoFk += 1;
      }
    }
    if (filtered.length === 0) {
      return;
    }
    await this.db
      .insertInto('post_objects')
      .values(filtered)
      .onConflict((oc) => oc.columns(['author', 'permlink', 'object_id']).doNothing())
      .execute();
  }

  private async flushReblogs(): Promise<void> {
    if (this.reblogBuffer.length === 0) {
      return;
    }
    const chunk = this.reblogBuffer;
    this.reblogBuffer = [];
    await this.db
      .insertInto('post_reblogged_users')
      .values(chunk)
      .onConflict((oc) => oc.columns(['author', 'permlink', 'account']).doNothing())
      .execute();
  }

  private async flushLanguages(): Promise<void> {
    if (this.languageBuffer.length === 0) {
      return;
    }
    const chunk = this.languageBuffer;
    this.languageBuffer = [];
    await this.db
      .insertInto('post_languages')
      .values(chunk)
      .onConflict((oc) => oc.columns(['author', 'permlink', 'language']).doNothing())
      .execute();
  }

  private async flushLinks(): Promise<void> {
    if (this.linkBuffer.length === 0) {
      return;
    }
    const chunk = this.linkBuffer;
    this.linkBuffer = [];
    await this.db
      .insertInto('post_links')
      .values(chunk)
      .onConflict((oc) => oc.columns(['author', 'permlink', 'url']).doNothing())
      .execute();
  }

  private async flushMentions(): Promise<void> {
    if (this.mentionBuffer.length === 0) {
      return;
    }
    const chunk = this.mentionBuffer;
    this.mentionBuffer = [];
    await this.db
      .insertInto('post_mentions')
      .values(chunk)
      .onConflict((oc) => oc.columns(['author', 'permlink', 'account']).doNothing())
      .execute();
  }

  private async flushRelatedImages(): Promise<void> {
    if (this.relatedImagePending.length === 0) {
      return;
    }
    const chunk = this.relatedImagePending;
    this.relatedImagePending = [];

    const objectIds = [
      ...new Set(chunk.flatMap((post) => post.objectRows.map((row) => row.object_id))),
    ];
    const coreById = await this.resolveObjectsCoreByIds(objectIds);

    const filtered: NewPostObjectRelatedImage[] = [];
    for (const post of chunk) {
      const imageUrls = extractPostImageUrls(post.jsonMetadata);
      if (imageUrls.length === 0) {
        this.stats.relatedImageRowsSkippedNoImages += post.objectRows.length;
        continue;
      }

      const postObjects: NewPostObject[] = [];
      for (const row of post.objectRows) {
        const coreType = coreById.get(row.object_id);
        if (coreType === undefined) {
          this.stats.relatedImageRowsSkippedNoFk += 1;
          continue;
        }
        const objectType = coreType;
        if (!isObjectTypeEligibleForRelatedAlbum(objectType)) {
          this.stats.relatedImageRowsSkippedIneligibleType += 1;
          continue;
        }
        postObjects.push({ ...row, object_type: objectType });
      }

      const rows = buildRelatedImageRows(
        postObjects.map((row) => ({
          object_id: row.object_id,
          object_type: row.object_type ?? null,
        })),
        post.author,
        post.permlink,
        imageUrls,
      );
      for (const row of rows) {
        filtered.push(row);
        this.stats.relatedImageRowsBuffered += 1;
      }
    }

    if (filtered.length === 0) {
      return;
    }
    await this.db
      .insertInto('post_object_related_images')
      .values(filtered)
      .onConflict((oc) =>
        oc.columns(['object_id', 'author', 'permlink', 'image_url']).doNothing(),
      )
      .execute();
  }

  /** FK-safe order: posts → children. */
  async flushAll(): Promise<void> {
    await this.flushPosts();
    await this.flushVotes();
    await this.flushObjects();
    await this.flushRelatedImages();
    await this.flushReblogs();
    await this.flushLanguages();
    await this.flushLinks();
    await this.flushMentions();
  }

  async flushAfterPostIfNeeded(): Promise<void> {
    if (this.postBuffer.length >= BATCH_SIZE) {
      await this.flushPosts();
    }
    if (this.voteBuffer.length >= BATCH_SIZE) {
      await this.flushPosts();
      await this.flushVotes();
    }
    if (this.objectBuffer.length >= BATCH_SIZE) {
      await this.flushPosts();
      await this.flushVotes();
      await this.flushObjects();
      await this.flushRelatedImages();
    }
    if (this.reblogBuffer.length >= BATCH_SIZE) {
      await this.flushPosts();
      await this.flushVotes();
      await this.flushObjects();
      await this.flushRelatedImages();
      await this.flushReblogs();
    }
    if (this.languageBuffer.length >= BATCH_SIZE) {
      await this.flushPosts();
      await this.flushVotes();
      await this.flushObjects();
      await this.flushRelatedImages();
      await this.flushReblogs();
      await this.flushLanguages();
    }
    if (this.linkBuffer.length >= BATCH_SIZE) {
      await this.flushPosts();
      await this.flushVotes();
      await this.flushObjects();
      await this.flushRelatedImages();
      await this.flushReblogs();
      await this.flushLanguages();
      await this.flushLinks();
    }
    if (this.mentionBuffer.length >= BATCH_SIZE) {
      await this.flushPosts();
      await this.flushVotes();
      await this.flushObjects();
      await this.flushRelatedImages();
      await this.flushReblogs();
      await this.flushLanguages();
      await this.flushLinks();
      await this.flushMentions();
    }
    if (this.relatedImagePending.length >= BATCH_SIZE) {
      await this.flushPosts();
      await this.flushVotes();
      await this.flushObjects();
      await this.flushRelatedImages();
    }
  }

  private pushPost(row: PostInsertBuffer): void {
    this.postBuffer.push(row);
    this.stats.postRowsBuffered += 1;
  }

  private pushVote(row: NewPostActiveVote): void {
    this.voteBuffer.push(row);
    this.stats.voteRowsBuffered += 1;
  }

  private pushObject(row: NewPostObject): void {
    this.objectBuffer.push(row);
    this.stats.objectRowsBuffered += 1;
  }

  private pushReblog(row: NewPostRebloggedUser): void {
    this.reblogBuffer.push(row);
    this.stats.reblogRowsBuffered += 1;
  }

  private pushLanguage(row: NewPostLanguage): void {
    this.languageBuffer.push(row);
    this.stats.languageRowsBuffered += 1;
  }

  private pushLink(row: NewPostLink): void {
    this.linkBuffer.push(row);
    this.stats.linkRowsBuffered += 1;
  }

  private pushMention(row: NewPostMention): void {
    this.mentionBuffer.push(row);
    this.stats.mentionRowsBuffered += 1;
  }

  private pushRelatedImagesForPost(
    author: string,
    permlink: string,
    jsonMetadata: string,
    objectRows: NewPostObject[],
  ): void {
    if (objectRows.length === 0) {
      return;
    }
    this.relatedImagePending.push({
      author,
      permlink,
      jsonMetadata,
      objectRows,
    });
  }

  processPost(doc: MongoPost): void {
    this.stats.postsSeen += 1;
    const author = doc.author?.trim();
    const permlink = doc.permlink?.trim();
    if (!author || !permlink) {
      this.stats.postsSkippedMissingPk += 1;
      return;
    }
    if (author.includes('_')) {
      this.stats.postsSkippedUnderscoreInAuthor += 1;
      return;
    }

    const titleTrim = doc.title?.trim() ?? '';
    const bodyTrim = doc.body?.trim() ?? '';
    if (titleTrim === '' && bodyTrim === '') {
      this.stats.postsSkippedEmptyTitleBody += 1;
      return;
    }

    const createdUnix = parseCreatedUnix(doc);

    const rootAuthor = strOrEmpty(doc.root_author, author);
    const rootPermlink = strOrEmpty(doc.root_permlink, permlink);

    const beneficiariesRaw = doc.beneficiaries ?? [];
    const beneficiariesData: JsonValue = Array.isArray(beneficiariesRaw)
      ? (beneficiariesRaw as JsonValue)
      : [];

    const postRow: PostInsertBuffer = {
      author,
      permlink,
      hive_id: doc.id ?? null,
      author_reputation: toBigInt(doc.author_reputation),
      author_weight: doc.author_weight ?? 0,
      parent_author: strOrEmpty(doc.parent_author),
      parent_permlink: strOrEmpty(doc.parent_permlink),
      title: strOrEmpty(doc.title),
      body: strOrEmpty(doc.body),
      json_metadata: serializeMongoPostJsonMetadata(doc.json_metadata),
      app: strOrNull(doc.app),
      depth: doc.depth ?? null,
      category: strOrNull(doc.category),
      last_update: strOrNull(doc.last_update),
      created: strOrNull(doc.created),
      active: strOrNull(doc.active),
      last_payout: strOrNull(doc.last_payout),
      children: doc.children ?? 0,
      net_rshares: toBigInt(doc.net_rshares),
      abs_rshares: toBigInt(doc.abs_rshares),
      vote_rshares: toBigInt(doc.vote_rshares),
      children_abs_rshares: toBigIntOrNull(doc.children_abs_rshares),
      cashout_time: strOrNull(doc.cashout_time),
      reward_weight: strOrNull(doc.reward_weight),
      total_payout_value: strOrEmpty(doc.total_payout_value, '0.000 HBD'),
      curator_payout_value: strOrEmpty(doc.curator_payout_value, '0.000 HBD'),
      author_rewards: doc.author_rewards ?? null,
      net_votes: doc.net_votes ?? null,
      root_author: rootAuthor,
      root_permlink: rootPermlink,
      root_title: strOrNull(doc.root_title),
      max_accepted_payout: strOrEmpty(doc.max_accepted_payout, '1000000.000 HBD'),
      percent_steem_dollars: doc.percent_steem_dollars ?? null,
      allow_replies: doc.allow_replies ?? null,
      allow_votes: doc.allow_votes ?? null,
      allow_curation_rewards: doc.allow_curation_rewards ?? null,
      beneficiariesData,
      url: strOrNull(doc.url),
      pending_payout_value: strOrEmpty(doc.pending_payout_value, '0.000 HBD'),
      total_pending_payout_value: strOrEmpty(doc.total_pending_payout_value, '0.000 HBD'),
      total_vote_weight: toBigIntOrNull(doc.total_vote_weight),
      promoted: strOrNull(doc.promoted),
      body_length: doc.body_length ?? null,
      net_rshares_waiv: doc.net_rshares_WAIV ?? 0,
      total_payout_waiv: doc.total_payout_WAIV ?? 0,
      total_rewards_waiv: doc.total_rewards_WAIV ?? 0,
      rewards_finalized_at: deriveRewardsFinalizedAt(
        strOrNull(doc.cashout_time),
        doc.depth ?? null,
      ),
      created_unix: createdUnix,
    };

    this.pushPost(postRow);

    for (const v of doc.active_votes ?? []) {
      const voter = v.voter?.trim();
      if (!voter) {
        continue;
      }
      this.pushVote({
        author,
        permlink,
        voter,
        weight: toFloatOrNull(v.weight),
        percent: toFloatOrNull(v.percent),
        rshares: toBigIntOrNull(v.rshares),
        rshares_waiv: toFloatOrNull(v.rsharesWAIV),
      });
    }

    const metaRecord = buildMongoPostMetadataRecord(doc);
    const typeById = objectTypeByIdFromLegacyWobjects(doc);
    const objectRows = bindPostObjectsToPost(
      parsePostObjectsForInsert(metaRecord ?? {}, doc.body ?? ''),
      author,
      permlink,
    );
    const enrichedObjects: NewPostObject[] = [];
    for (const row of objectRows) {
      const enriched = {
        ...row,
        object_type: row.object_type ?? typeById.get(row.object_id) ?? null,
      };
      enrichedObjects.push(enriched);
      this.pushObject(enriched);
    }

    this.pushRelatedImagesForPost(
      author,
      permlink,
      serializeMongoPostJsonMetadata(doc.json_metadata),
      enrichedObjects,
    );

    for (const account of doc.reblogged_users ?? []) {
      const acc = account?.trim();
      if (!acc) {
        continue;
      }
      this.pushReblog({
        author,
        permlink,
        account: acc,
        // Provisional: Hive `get_blog_entries.reblogged_on` is the real time.
        // Required after this importer: `pnpm backfill:reblog-timestamps`.
        reblogged_at_unix: createdUnix,
      });
    }

    const languagesSeen = new Set<string>();
    for (const lang of doc.languages ?? []) {
      const normalized = normalizeMongoPostLanguage(
        typeof lang === 'string' ? lang : String(lang ?? ''),
      );
      if (!normalized || languagesSeen.has(normalized)) {
        continue;
      }
      languagesSeen.add(normalized);
      this.pushLanguage({ author, permlink, language: normalized });
    }

    for (const link of doc.links ?? []) {
      const url = link?.trim();
      if (!url) {
        continue;
      }
      this.pushLink({ author, permlink, url });
    }

    for (const m of doc.mentions ?? []) {
      const account = m?.trim();
      if (!account) {
        continue;
      }
      this.pushMention({ author, permlink, account });
    }
  }
}

async function dropPostBulkIndexes(db: Kysely<OdlDatabase>): Promise<void> {
  console.log('Dropping posts and satellite table indexes...');
  await sql`DROP INDEX IF EXISTS idx_post_mentions_account`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_post_links_url`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_post_languages_language`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_post_reblogged_users_account_reblogged_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_post_objects_object_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_post_objects_object_type`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_post_object_related_images_object_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_post_active_votes_voter`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_posts_author_created_unix`.execute(db);
  console.log('Indexes dropped.');
}

async function recreatePostBulkIndexes(db: Kysely<OdlDatabase>): Promise<void> {
  console.log('Recreating posts and satellite table indexes...');
  await sql`CREATE INDEX idx_posts_author_created_unix ON posts (author, created_unix DESC)`.execute(db);
  await sql`CREATE INDEX idx_post_active_votes_voter ON post_active_votes (voter)`.execute(db);
  await sql`CREATE INDEX idx_post_objects_object_id ON post_objects (object_id)`.execute(db);
  await sql`CREATE INDEX idx_post_objects_object_type ON post_objects (object_type) WHERE object_type IS NOT NULL`.execute(db);
  await sql`CREATE INDEX idx_post_object_related_images_object_id ON post_object_related_images (object_id)`.execute(db);
  await sql`CREATE INDEX idx_post_reblogged_users_account_reblogged_at ON post_reblogged_users (account, reblogged_at_unix DESC)`.execute(db);
  await sql`CREATE INDEX idx_post_languages_language ON post_languages (language)`.execute(db);
  await sql`CREATE INDEX idx_post_links_url ON post_links (url)`.execute(db);
  await sql`CREATE INDEX idx_post_mentions_account ON post_mentions (account)`.execute(db);
  console.log('Indexes recreated.');
}

async function migrateFile(filePath: string, skipIndexes: boolean): Promise<void> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    fail(`File not found: ${resolved}`);
  }

  const databaseUrl = resolveConnectionString();

  const migrator = new MongoPostsMigrator(databaseUrl);

  if (skipIndexes) {
    await dropPostBulkIndexes(migrator.db);
  }

  try {
    const sink = new Writable({
      objectMode: true,
      write(
        item: { key: number; value: MongoPost },
        _encoding: BufferEncoding,
        callback: (err?: Error | null) => void,
      ) {
        migrator.processPost(item.value);
        migrator
          .flushAfterPostIfNeeded()
          .then(() => {
            if ((item.key + 1) % 1000 === 0) {
              console.log(`Processed ${item.key + 1} posts...`);
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
      await recreatePostBulkIndexes(migrator.db);
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
      'Usage: tsx scripts/migrate-mongo-to-pg/posts/index.ts <path-to-posts.json> [--skip-indexes]',
    );
  }

  migrateFile(fileArg, skipIndexes).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}

main();
