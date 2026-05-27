/**
 * Stream MongoDB wobject JSON array export into ODL Postgres tables.
 * Usage: pnpm migrate:mongo-objects <path-to.json> [--skip-indexes]
 * Requires POSTGRES_HOST, POSTGRES_USER, POSTGRES_DATABASE (and optionally POSTGRES_PASSWORD, POSTGRES_PORT).
 *
 * --skip-indexes  Drop secondary indexes (and object_updates FTS trigger) on
 *                 objects_core, object_updates, validity_votes, rank_votes,
 *                 object_authority before bulk insert; recreate after.
 *                 Dramatically faster for large files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

import { resolveConnectionString } from '../../../libs/migrations/src/connection';

import type {
  NewObjectAuthority,
  NewObjectsCore,
  NewObjectUpdate,
  NewRankVote,
  NewValidityVote,
  OdlDatabase,
} from '../../../libs/core/src/db';
import { OBJECT_TYPE_REGISTRY } from '../../../libs/core/src/object-type-registry';
import { UPDATE_REGISTRY } from '../../../libs/core/src/update-registry';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import streamArray from 'stream-json/streamers/stream-array.js';

import {
  AUTHORITY_LEGACY_FIELD_NAME,
  SKIP_LEGACY_FIELD_NAMES,
  resolveUpdateType,
} from './field-name-map';
import type { MongoRatingVote, MongoWObject, MongoWObjectField } from './types';
import { createdAtUnixFromObjectId, mongoIdToString } from './utils';
import {
  buildLegacyGalleryAlbumIdToNameMap,
  migrateObjectRefBodyToText,
  transformImageGalleryItemFromField,
  transformJsonBody,
  transformJsonBodyMulti,
  transformPromotionSaleFromField,
  transformTagCategoryItemFromField,
} from './value-strategies';

const BATCH_SIZE = 5000;
const LEGACY_EVENT_SEQ = BigInt(0);
/** ODL default rank context (see rankVotePayloadSchema). */
const LEGACY_RANK_CONTEXT = 'default';

const AUTHORITY_TYPES = new Set<string>(['ownership', 'administrative']);

type InsertUpdateRow = Omit<
  NewObjectUpdate,
  'value_geo' | 'value_text' | 'value_json'
> & {
  value_text: string | null;
  value_json: unknown | null;
  value_geo: ReturnType<typeof sql> | null;
  /** Mirrors indexer: mean ODL rank (0–10000) across rank_votes for `aggregateRating` with `rank_aggregation: average`. */
  rank_score?: number | null;
};

interface MigrationStats {
  objectsSeen: number;
  objectsSkippedUnknownType: number;
  objectsSkippedMissingId: number;
  fieldsSkippedNoUpdateId: number;
  fieldsSkippedUnknownName: number;
  fieldsSkippedSkippedLegacy: number;
  fieldsSkippedNoRegistry: number;
  fieldsSkippedBadPayload: number;
  fieldsSkippedAuthorityInvalid: number;
  authorityRowsBuffered: number;
  updateRowsBuffered: number;
  voteRowsBuffered: number;
  coreRowsBuffered: number;
  votesSkippedZeroPercent: number;
  votesSkippedNoVoter: number;
  rankRowsBuffered: number;
  rankVotesSkippedOutOfRange: number;
  rankVotesSkippedNoVoter: number;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function geoJsonPointText(lon: number, lat: number): { geoJsonText: string } {
  return {
    geoJsonText: JSON.stringify({
      type: 'Point',
      coordinates: [lon, lat],
    }),
  };
}

/** JSON number or string (e.g. Mongo stores `"53.4"`); rejects NaN / non-finite. */
function parseGeoCoordinate(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t.length) {
      return null;
    }
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Accepts GeoJSON Point in `body` or legacy Waivio-style
 * `{"latitude": number, "longitude": number}` (order → [lon, lat] for PostGIS).
 * Coordinates may be strings after JSON.parse (same as Mongo exports).
 */
function parseGeoPointFromBody(body: string | undefined): {
  geoJsonText: string;
} | null {
  const trimmed = body?.trim() ?? '';
  if (!trimmed) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const o = parsed as Record<string, unknown>;

  if (o.type === 'Point' && Array.isArray(o.coordinates)) {
    const [lonRaw, latRaw] = o.coordinates;
    const lon = parseGeoCoordinate(lonRaw);
    const lat = parseGeoCoordinate(latRaw);
    if (lon === null || lat === null) {
      return null;
    }
    return geoJsonPointText(lon, lat);
  }

  const lat = parseGeoCoordinate(o.latitude);
  const lon = parseGeoCoordinate(o.longitude);
  if (lat === null || lon === null) {
    return null;
  }
  return geoJsonPointText(lon, lat);
}

function buildObjectLegacyTransactionId(author: string, authorPermlink: string): string {
  return `legacy_${author}_${authorPermlink}`;
}

function buildFieldLegacyTransactionId(fieldAuthor: string, permlink: string): string {
  return `legacy_${fieldAuthor}_${permlink}`;
}

function buildVoteLegacyTransactionId(
  fieldAuthor: string,
  permlink: string,
  voter: string,
): string {
  return `legacy_${fieldAuthor}_${permlink}_${voter}`;
}

function buildRankVoteLegacyTransactionId(
  fieldAuthor: string,
  permlink: string,
  voter: string,
): string {
  return `legacy_rank_${fieldAuthor}_${permlink}_${voter}`;
}

/** Typed as `rating_votes?[]` in MongoWObjectField; `unknown` accepts a lone object in bad exports. */
function normalizeRatingVotes(raw: unknown): MongoRatingVote[] {
  if (raw == null) {
    return [];
  }
  return Array.isArray(raw) ? (raw as MongoRatingVote[]) : [raw as MongoRatingVote];
}

/** Mongo 0..10 → ODL 0, 1000, .. 10000. Non-integers and out of range return null. */
function mongoRankToOdlRank(mongoRank: number): number | null {
  if (!Number.isFinite(mongoRank) || !Number.isInteger(mongoRank)) {
    return null;
  }
  if (mongoRank < 0 || mongoRank > 10) {
    return null;
  }
  return mongoRank * 1000;
}

/** Waivio Mongo uses **`rate`** for the tier; some exports use **`rank`** (same 0–10 scale). */
function mongoTierScoreFromRatingVote(rv: MongoRatingVote): number | null {
  const candidates: unknown[] = [rv.rank, rv.rate];
  for (const raw of candidates) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const n = Number(raw.trim());
      if (Number.isFinite(n)) {
        return n;
      }
    }
  }
  return null;
}

class MongoToPgMigrator {
  readonly db: Kysely<OdlDatabase>;

  private coreBuffer: NewObjectsCore[] = [];

  private updateBuffer: InsertUpdateRow[] = [];

  private authorityBuffer: NewObjectAuthority[] = [];

  private voteBuffer: NewValidityVote[] = [];

  private rankBuffer: NewRankVote[] = [];

  readonly stats: MigrationStats = {
    objectsSeen: 0,
    objectsSkippedUnknownType: 0,
    objectsSkippedMissingId: 0,
    fieldsSkippedNoUpdateId: 0,
    fieldsSkippedUnknownName: 0,
    fieldsSkippedSkippedLegacy: 0,
    fieldsSkippedNoRegistry: 0,
    fieldsSkippedBadPayload: 0,
    fieldsSkippedAuthorityInvalid: 0,
    authorityRowsBuffered: 0,
    updateRowsBuffered: 0,
    voteRowsBuffered: 0,
    coreRowsBuffered: 0,
    votesSkippedZeroPercent: 0,
    votesSkippedNoVoter: 0,
    rankRowsBuffered: 0,
    rankVotesSkippedOutOfRange: 0,
    rankVotesSkippedNoVoter: 0,
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

  private async flushCore(): Promise<void> {
    if (this.coreBuffer.length === 0) {
      return;
    }
    const chunk = this.coreBuffer;
    this.coreBuffer = [];
    await this.db
      .insertInto('objects_core')
      .values(chunk)
      .onConflict((oc) => oc.column('object_id').doNothing())
      .execute();
  }

  private async flushUpdates(): Promise<void> {
    if (this.updateBuffer.length === 0) {
      return;
    }
    const chunk = this.updateBuffer;
    this.updateBuffer = [];
    // node-postgres does not JSON.stringify JS strings — it sends them as raw
    // text, which Postgres rejects for JSONB columns. Explicitly cast all
    // non-null value_json through a sql literal so the serialization is
    // always correct regardless of the JS runtime type.
    const rows = chunk.map((row) => ({
      ...row,
      value_json:
        row.value_json !== null
          ? sql`${JSON.stringify(row.value_json)}::jsonb`
          : null,
    }));
    await this.db
      .insertInto('object_updates')
      .values(rows as unknown as NewObjectUpdate[])
      .onConflict((oc) => oc.column('update_id').doNothing())
      .execute();
  }

  private async flushAuthority(): Promise<void> {
    if (this.authorityBuffer.length === 0) {
      return;
    }
    const chunk = this.authorityBuffer;
    this.authorityBuffer = [];
    await this.db
      .insertInto('object_authority')
      .values(chunk)
      .onConflict((oc) =>
        oc.columns(['object_id', 'account', 'authority_type']).doNothing(),
      )
      .execute();
  }

  private async flushVotes(): Promise<void> {
    if (this.voteBuffer.length === 0) {
      return;
    }
    const chunk = this.voteBuffer;
    this.voteBuffer = [];
    await this.db
      .insertInto('validity_votes')
      .values(chunk)
      .onConflict((oc) => oc.columns(['update_id', 'voter']).doNothing())
      .execute();
  }

  private async flushRankVotes(): Promise<void> {
    if (this.rankBuffer.length === 0) {
      return;
    }
    const chunk = this.rankBuffer;
    this.rankBuffer = [];
    await this.db
      .insertInto('rank_votes')
      .values(chunk)
      .onConflict((oc) =>
        oc.columns(['update_id', 'voter', 'rank_context']).doNothing(),
      )
      .execute();
  }

  /** FK-safe order: core → updates → rank_votes → authority → validity_votes. */
  async flushAll(): Promise<void> {
    await this.flushCore();
    await this.flushUpdates();
    await this.flushRankVotes();
    await this.flushAuthority();
    await this.flushVotes();
  }

  async flushAfterObjectIfNeeded(): Promise<void> {
    if (this.coreBuffer.length >= BATCH_SIZE) {
      await this.flushCore();
    }
    if (this.updateBuffer.length >= BATCH_SIZE) {
      await this.flushCore();
      await this.flushUpdates();
      await this.flushRankVotes();
    }
    if (this.authorityBuffer.length >= BATCH_SIZE) {
      await this.flushCore();
      await this.flushUpdates();
      await this.flushRankVotes();
      await this.flushAuthority();
    }
    if (this.rankBuffer.length >= BATCH_SIZE) {
      await this.flushCore();
      await this.flushUpdates();
      await this.flushRankVotes();
    }
    if (this.voteBuffer.length >= BATCH_SIZE) {
      await this.flushCore();
      await this.flushUpdates();
      await this.flushRankVotes();
      await this.flushVotes();
    }
  }

  private pushCore(row: NewObjectsCore): void {
    this.coreBuffer.push(row);
    this.stats.coreRowsBuffered += 1;
  }

  private pushUpdate(row: InsertUpdateRow): void {
    this.updateBuffer.push(row);
    this.stats.updateRowsBuffered += 1;
  }

  private pushAuthority(row: NewObjectAuthority): void {
    this.authorityBuffer.push(row);
    this.stats.authorityRowsBuffered += 1;
  }

  private pushVote(row: NewValidityVote): void {
    this.voteBuffer.push(row);
    this.stats.voteRowsBuffered += 1;
  }

  private pushRankVote(row: NewRankVote): void {
    this.rankBuffer.push(row);
    this.stats.rankRowsBuffered += 1;
  }

  /**
   * Resolver / projection read `rank_score` from `object_updates` (weighted average at indexer wire time).
   * Legacy Mongo only has plain `rating_votes[]`; replicate `rank_aggregation: average` here with equal WAIV fallback.
   */
  private applyPersistedMeanRankScoreToBufferedAggregateRating(
    updateId: string,
    meanOdlRank: number,
  ): void {
    for (let i = this.updateBuffer.length - 1; i >= 0; i--) {
      const row = this.updateBuffer[i];
      if (
        row &&
        row.update_id === updateId &&
        row.update_type === 'aggregateRating'
      ) {
        row.rank_score = meanOdlRank;
        return;
      }
    }
  }

  processWObject(doc: MongoWObject): void {
    this.stats.objectsSeen += 1;
    const objectType = doc.object_type?.trim();
    const authorPermlink = doc.author_permlink?.trim();
    const creator = doc.creator?.trim();
    const author = doc.author?.trim();

    if (!authorPermlink || !objectType || !creator || !author) {
      this.stats.objectsSkippedMissingId += 1;
      return;
    }
    if (!OBJECT_TYPE_REGISTRY[objectType]) {
      this.stats.objectsSkippedUnknownType += 1;
      return;
    }

    const objectTxId = buildObjectLegacyTransactionId(author, authorPermlink);
    this.pushCore({
      object_id: authorPermlink,
      object_type: objectType,
      creator,
      weight: doc.weight ?? null,
      meta_group_id: doc.metaGroupId?.trim() ?? null,
      transaction_id: objectTxId,
    });

    const fields = doc.fields ?? [];
    const galleryAlbumIdToName = buildLegacyGalleryAlbumIdToNameMap(fields);
    for (const field of fields) {
      this.processField(
        doc,
        authorPermlink,
        creator,
        author,
        field,
        galleryAlbumIdToName,
      );
    }
  }

  private processField(
    doc: MongoWObject,
    objectId: string,
    objectCreator: string,
    objectAuthor: string,
    field: MongoWObjectField,
    galleryAlbumIdToName: Map<string, string>,
  ): void {
    const legacyName = field.name?.trim();
    if (!legacyName) {
      this.stats.fieldsSkippedUnknownName += 1;
      return;
    }

    if (legacyName === AUTHORITY_LEGACY_FIELD_NAME) {
      this.processAuthorityField(objectId, field);
      return;
    }

    if (SKIP_LEGACY_FIELD_NAMES.has(legacyName)) {
      this.stats.fieldsSkippedSkippedLegacy += 1;
      return;
    }

    const updateType = resolveUpdateType(legacyName);
    if (!updateType) {
      this.stats.fieldsSkippedUnknownName += 1;
      return;
    }

    const def = UPDATE_REGISTRY[updateType];
    if (!def) {
      this.stats.fieldsSkippedNoRegistry += 1;
      return;
    }

    const fieldId = mongoIdToString(field._id);
    if (!fieldId) {
      this.stats.fieldsSkippedNoUpdateId += 1;
      return;
    }

    const createdAt = createdAtUnixFromObjectId(fieldId);
    const fieldAuthor = field.author?.trim() ?? objectAuthor;
    const permlink = field.permlink?.trim() ?? '';
    const fieldTxId = buildFieldLegacyTransactionId(fieldAuthor, permlink);
    const fieldCreator = field.creator?.trim() ?? objectCreator;

    const localeRaw = field.locale?.trim();
    const locale = localeRaw && localeRaw.length > 0 ? localeRaw : null;

    let value_text: string | null = null;
    let value_json: unknown | null = null;
    let value_geo: ReturnType<typeof sql> | null = null;

    if (def.value_kind === 'object_ref') {
      const refResult = migrateObjectRefBodyToText(field.body ?? '', updateType);
      if (!refResult.ok) {
        this.stats.fieldsSkippedBadPayload += 1;
        return;
      }
      value_text = refResult.value;
    } else if (def.value_kind === 'text') {
      const body = field.body ?? '';
      value_text = body;
    } else if (def.value_kind === 'geo') {
      const parsed = parseGeoPointFromBody(field.body);
      if (!parsed) {
        this.stats.fieldsSkippedBadPayload += 1;
        return;
      }
      value_geo = sql`ST_GeomFromGeoJSON(${parsed.geoJsonText}::text)::geography`;
    } else {
      const promoSale = transformPromotionSaleFromField(updateType, field);
      const tagCategoryItem = transformTagCategoryItemFromField(updateType, field);
      const imageGalleryItem = transformImageGalleryItemFromField(
        updateType,
        field,
        galleryAlbumIdToName,
      );
      if (promoSale !== null) {
        if (!promoSale.ok) {
          this.stats.fieldsSkippedBadPayload += 1;
          return;
        }
        value_json = promoSale.value;
      } else if (tagCategoryItem !== null) {
        if (!tagCategoryItem.ok) {
          this.stats.fieldsSkippedBadPayload += 1;
          return;
        }
        value_json = tagCategoryItem.value;
      } else if (imageGalleryItem !== null) {
        if (!imageGalleryItem.ok) {
          this.stats.fieldsSkippedBadPayload += 1;
          return;
        }
        value_json = imageGalleryItem.value;
      } else {
        const multi = transformJsonBodyMulti(
          legacyName,
          updateType,
          field.body ?? '',
        );
        if (multi !== null) {
          if (!multi.ok) {
            this.stats.fieldsSkippedBadPayload += 1;
            return;
          }
          for (const { suffix, value } of multi.values) {
            this.pushUpdate({
              update_id: fieldId + suffix,
              object_id: objectId,
              update_type: updateType,
              creator: fieldCreator,
              locale,
              created_at_unix: createdAt,
              event_seq: LEGACY_EVENT_SEQ,
              transaction_id: fieldTxId,
              value_text: null,
              value_json: value,
              value_geo: null,
            });
            this.processVotesForField(
              objectId,
              fieldId + suffix,
              fieldAuthor,
              permlink,
              field.active_votes,
            );
          }
          return;
        }

        const jsonResult = transformJsonBody(legacyName, updateType, field.body ?? '');
        if (!jsonResult.ok) {
          this.stats.fieldsSkippedBadPayload += 1;
          return;
        }
        value_json = jsonResult.value;
      }
    }

    this.pushUpdate({
      update_id: fieldId,
      object_id: objectId,
      update_type: updateType,
      creator: fieldCreator,
      locale,
      created_at_unix: createdAt,
      event_seq: LEGACY_EVENT_SEQ,
      transaction_id: fieldTxId,
      value_text,
      value_json,
      value_geo,
    });

    this.processVotesForField(
      objectId,
      fieldId,
      fieldAuthor,
      permlink,
      field.active_votes,
    );
    if (updateType === 'aggregateRating') {
      this.processRatingVotesForField(
        objectId,
        fieldId,
        fieldAuthor,
        permlink,
        field,
      );
    }
  }

  private processAuthorityField(objectId: string, field: MongoWObjectField): void {
    const body = field.body?.trim();
    const account = field.creator?.trim();
    if (!body || !AUTHORITY_TYPES.has(body) || !account) {
      this.stats.fieldsSkippedAuthorityInvalid += 1;
      return;
    }
    const idHex = mongoIdToString(field._id);
    const createdAtSec = idHex ? createdAtUnixFromObjectId(idHex) : 0;
    const createdAt = new Date(createdAtSec * 1000);
    this.pushAuthority({
      object_id: objectId,
      account,
      authority_type: body as 'ownership' | 'administrative',
      created_at: createdAt,
    });
  }

  private processVotesForField(
    objectId: string,
    updateId: string,
    fieldAuthor: string,
    permlink: string,
    votes: MongoWObjectField['active_votes'],
  ): void {
    if (!votes?.length) {
      return;
    }
    for (const vote of votes) {
      const voter = vote.voter?.trim();
      if (!voter) {
        this.stats.votesSkippedNoVoter += 1;
        continue;
      }
      const percent = vote.percent;
      if (percent === undefined || percent === null) {
        this.stats.votesSkippedZeroPercent += 1;
        continue;
      }
      if (percent === 0) {
        this.stats.votesSkippedZeroPercent += 1;
        continue;
      }
      const voteValue: 'for' | 'against' = percent > 0 ? 'for' : 'against';
      this.pushVote({
        update_id: updateId,
        object_id: objectId,
        voter,
        vote: voteValue,
        event_seq: LEGACY_EVENT_SEQ,
        transaction_id: buildVoteLegacyTransactionId(fieldAuthor, permlink, voter),
      });
    }
  }

  private processRatingVotesForField(
    objectId: string,
    updateId: string,
    fieldAuthor: string,
    permlink: string,
    field: MongoWObjectField,
  ): void {
    const entries = normalizeRatingVotes(field.rating_votes);
    if (entries.length === 0) {
      return;
    }
    const odlRankValues: number[] = [];
    for (const rv of entries) {
      const voter = rv.voter?.trim();
      if (!voter) {
        this.stats.rankVotesSkippedNoVoter += 1;
        continue;
      }
      const mongoTierRaw = mongoTierScoreFromRatingVote(rv);
      if (mongoTierRaw === null) {
        this.stats.rankVotesSkippedOutOfRange += 1;
        continue;
      }
      const mongoTierRounded = Math.round(mongoTierRaw);
      const odlRank = mongoRankToOdlRank(mongoTierRounded);
      if (odlRank === null) {
        this.stats.rankVotesSkippedOutOfRange += 1;
        continue;
      }
      odlRankValues.push(odlRank);
      this.pushRankVote({
        update_id: updateId,
        object_id: objectId,
        voter,
        rank: odlRank,
        rank_context: LEGACY_RANK_CONTEXT,
        event_seq: LEGACY_EVENT_SEQ,
        transaction_id: buildRankVoteLegacyTransactionId(
          fieldAuthor,
          permlink,
          voter,
        ),
      });
    }
    if (odlRankValues.length > 0) {
      const mean = Math.round(
        odlRankValues.reduce((a, b) => a + b, 0) / odlRankValues.length,
      );
      this.applyPersistedMeanRankScoreToBufferedAggregateRating(updateId, mean);
    }
  }
}

async function dropObjectUpdatesIndexes(db: Kysely<OdlDatabase>): Promise<void> {
  console.log('Dropping object migration indexes and object_updates trigger...');
  await sql`ALTER TABLE object_updates DISABLE TRIGGER tr_object_updates_search_vector`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_search_vector`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_object_rank_score`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_value_geo`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_update_type_value_text`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_update_type_value_text_normalized`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_object_id_update_type`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_authority_object_id_authority_type`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_authority_account`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_rank_votes_object_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_validity_votes_object_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_object_type_weight`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_creator`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_canonical`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_canonical_creator`.execute(db);
  console.log('Indexes dropped.');
}

async function recreateObjectUpdatesIndexes(db: Kysely<OdlDatabase>): Promise<void> {
  console.log('Recreating object migration indexes...');
  await sql`CREATE INDEX idx_objects_core_object_type_weight ON objects_core (object_type, weight DESC NULLS LAST)`.execute(db);
  await sql`CREATE INDEX idx_objects_core_creator ON objects_core (creator)`.execute(db);
  await sql`
    CREATE INDEX idx_objects_core_canonical
    ON objects_core (canonical)
    WHERE canonical IS NOT NULL
  `.execute(db);
  await sql`
    CREATE INDEX idx_objects_core_canonical_creator
    ON objects_core (canonical_creator)
    WHERE canonical_creator IS NOT NULL
  `.execute(db);
  console.log('  objects_core secondary indexes done');
  await sql`CREATE INDEX idx_validity_votes_object_id ON validity_votes (object_id)`.execute(db);
  await sql`CREATE INDEX idx_rank_votes_object_id ON rank_votes (object_id)`.execute(db);
  await sql`CREATE INDEX idx_object_authority_object_id_authority_type ON object_authority (object_id, authority_type)`.execute(db);
  await sql`CREATE INDEX idx_object_authority_account ON object_authority (account)`.execute(db);
  console.log('  validity_votes / rank_votes / object_authority indexes done');
  await sql`CREATE INDEX idx_object_updates_object_id_update_type ON object_updates (object_id, update_type)`.execute(db);
  await sql`CREATE INDEX idx_object_updates_value_geo ON object_updates USING GIST (value_geo)`.execute(db);
  await sql`CREATE INDEX idx_object_updates_update_type_value_text ON object_updates (update_type, LEFT(value_text, 2048)) WHERE value_text IS NOT NULL`.execute(db);
  await sql`CREATE INDEX idx_object_updates_update_type_value_text_normalized ON object_updates (update_type, LEFT(value_text_normalized, 2048)) WHERE value_text_normalized IS NOT NULL`.execute(db);
  await sql`CREATE INDEX idx_object_updates_object_rank_score ON object_updates (object_id, rank_score)`.execute(db);
  console.log('  object_updates btree/geo/rank indexes done');
  await sql`ALTER TABLE object_updates ENABLE TRIGGER tr_object_updates_search_vector`.execute(db);
  await sql`
    UPDATE object_updates
    SET search_vector = to_tsvector('english', value_text)
    WHERE value_text IS NOT NULL
  `.execute(db);
  await sql`CREATE INDEX idx_object_updates_search_vector ON object_updates USING GIN (search_vector)`.execute(db);
  console.log('  object_updates search_vector GIN done');
  console.log('Indexes recreated.');
}

async function migrateFile(filePath: string, skipIndexes: boolean): Promise<void> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    fail(`File not found: ${resolved}`);
  }

  const databaseUrl = resolveConnectionString();

  const migrator = new MongoToPgMigrator(databaseUrl);

  if (skipIndexes) {
    await dropObjectUpdatesIndexes(migrator.db);
  }

  try {
    const sink = new Writable({
      objectMode: true,
      write(
        item: { key: number; value: MongoWObject },
        _encoding: BufferEncoding,
        callback: (err?: Error | null) => void,
      ) {
        migrator.processWObject(item.value);
        migrator
          .flushAfterObjectIfNeeded()
          .then(() => {
            if ((item.key + 1) % 1000 === 0) {
              console.log(`Processed ${item.key + 1} objects...`);
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
      await recreateObjectUpdatesIndexes(migrator.db);
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
      'Usage: tsx scripts/migrate-mongo-to-pg/objects/index.ts <path-to-wobjects.json> [--skip-indexes]',
    );
  }

  migrateFile(fileArg, skipIndexes).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}

main();
