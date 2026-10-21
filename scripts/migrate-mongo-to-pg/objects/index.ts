/**
 * Stream MongoDB wobject JSON array export into ODL Postgres tables.
 * Usage: pnpm migrate:mongo-objects <path-to.json> [--skip-indexes]
 *        pnpm migrate:mongo-objects --recreate-indexes
 * Requires POSTGRES_HOST, POSTGRES_USER, POSTGRES_DATABASE (and optionally POSTGRES_PASSWORD, POSTGRES_PORT).
 *
 * --skip-indexes  Drop secondary indexes (and object_updates FTS trigger) on
 *                 objects_core, object_updates, validity_votes, rank_votes,
 *                 object_favorite, object_ownership before bulk insert; recreate after.
 *                 Keep in sync with libs/migrations/src/postgres/odl indexes on
 *                 those tables (through 00059_object_updates_search_json_prefix).
 * --recreate-indexes  Only run index recreate (resume after a failed --skip-indexes
 *                 recreate; CREATE INDEX IF NOT EXISTS). No JSON file required.
 *
 * Re-runs: inserts use ON CONFLICT DO NOTHING for child tables; objects_core
 * updates `created_at` when the export includes `createdAt` (COALESCE keeps
 * existing value when the row omits `created_at`), and `meta_group_id` /
 * `weight` when the dump provides a non-null value (dump wins; never wipe
 * an existing value with null).
 */

import * as fs from 'fs';
import * as path from 'path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

import { resolveConnectionString } from '../../../libs/migrations/src/connection';
import { dateFromMongoObjectIdHex } from '../mongo-object-id-date';

import type {
  NewObjectFavorite,
  NewObjectOwnership,
  NewObjectsCore,
  NewObjectUpdate,
  NewRankVote,
  NewValidityVote,
  OdlDatabase,
} from '@opden-data-layer/odl-db-types';
import { OBJECT_TYPE_REGISTRY } from '../../../libs/core/src/object-type-registry';
import { UPDATE_REGISTRY } from '../../../libs/core/src/update-registry';
import { UPDATE_TYPES } from '../../../libs/core/src/update-registry/update-types';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import streamArray from 'stream-json/streamers/stream-array.js';

import {
  AUTHORITY_LEGACY_FIELD_NAME,
  SKIP_LEGACY_FIELD_NAMES,
  resolveUpdateType,
} from './field-name-map';
import type { MongoRatingVote, MongoWObject, MongoWObjectField } from './types';
import { shouldSkipLegacyAffiliateCode } from './affiliate-code-skip';
import {
  createdAtUnixFromObjectId,
  legacyEventSeqFromObjectIdHex,
  mongoActiveVotesHasVoter,
  mongoIdToString,
  normalizeLegacyFieldBody,
  parseMongoCreatedAt,
} from './utils';
import {
  buildLegacyGalleryAlbumIdToNameMap,
  migrateObjectRefBodyToText,
  transformImageGalleryItemFromField,
  transformJsonBody,
  transformJsonBodyMulti,
  transformPromotionSaleFromField,
  transformTagCategoryItemFromField,
  transformTelephoneFromField,
} from './value-strategies';
import { mapMongoAuthorityField } from './authority-field-map';

const BATCH_SIZE = 5000;
/** ODL default rank context (see rankVotePayloadSchema). */
const LEGACY_RANK_CONTEXT = 'default';

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
  fieldsSkippedAffiliateDomainScope: number;
  fieldsSkippedAuthorityInvalid: number;
  favoriteRowsBuffered: number;
  ownershipRowsBuffered: number;
  updateRowsBuffered: number;
  voteRowsBuffered: number;
  coreRowsBuffered: number;
  votesSkippedZeroPercent: number;
  votesSkippedNoVoter: number;
  creatorVotesAdded: number;
  creatorVotesSkippedAlreadyPresent: number;
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

/**
 * Vote transaction_id starts with the vote's own MongoDB ObjectId hex so that
 * lexicographic sort on transaction_id yields chronological vote order.
 * Falls back to a placeholder when the vote has no _id (older exports).
 */
function buildVoteLegacyTransactionId(
  voteOidHex: string | null,
  fieldAuthor: string,
  permlink: string,
  voter: string,
): string {
  const prefix = voteOidHex ?? '000000000000000000000000';
  return `legacy_${prefix}_${fieldAuthor}_${permlink}_${voter}`;
}

function buildRankVoteLegacyTransactionId(
  voteOidHex: string | null,
  fieldAuthor: string,
  permlink: string,
  voter: string,
): string {
  const prefix = voteOidHex ?? '000000000000000000000000';
  return `legacy_rank_${prefix}_${fieldAuthor}_${permlink}_${voter}`;
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

  private favoriteBuffer: NewObjectFavorite[] = [];

  private ownershipBuffer: NewObjectOwnership[] = [];

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
    fieldsSkippedAffiliateDomainScope: 0,
    fieldsSkippedAuthorityInvalid: 0,
    favoriteRowsBuffered: 0,
    ownershipRowsBuffered: 0,
    updateRowsBuffered: 0,
    voteRowsBuffered: 0,
    coreRowsBuffered: 0,
    votesSkippedZeroPercent: 0,
    votesSkippedNoVoter: 0,
    creatorVotesAdded: 0,
    creatorVotesSkippedAlreadyPresent: 0,
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
      .onConflict((oc) =>
        oc.column('object_id').doUpdateSet((eb) => ({
          created_at: sql`CASE WHEN ${eb.ref('excluded.created_at')} IS NOT NULL THEN ${eb.ref('excluded.created_at')} ELSE ${eb.ref('objects_core.created_at')} END`,
          // Dump is source of truth for product groups; keep existing when dump omits.
          meta_group_id: sql`COALESCE(${eb.ref('excluded.meta_group_id')}, ${eb.ref('objects_core.meta_group_id')})`,
          weight: sql`COALESCE(${eb.ref('excluded.weight')}, ${eb.ref('objects_core.weight')})`,
        })),
      )
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

  private async flushFavorites(): Promise<void> {
    if (this.favoriteBuffer.length === 0) {
      return;
    }
    const chunk = this.favoriteBuffer;
    this.favoriteBuffer = [];
    await this.db
      .insertInto('object_favorite')
      .values(chunk)
      .onConflict((oc) => oc.columns(['object_id', 'account']).doNothing())
      .execute();
  }

  private async flushOwnerships(): Promise<void> {
    if (this.ownershipBuffer.length === 0) {
      return;
    }
    const chunk = this.ownershipBuffer;
    this.ownershipBuffer = [];
    await this.db
      .insertInto('object_ownership')
      .values(chunk)
      .onConflict((oc) => oc.columns(['object_id', 'account']).doNothing())
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

  /** FK-safe order: core → updates → rank_votes → favorite/ownership → validity_votes. */
  async flushAll(): Promise<void> {
    await this.flushCore();
    await this.flushUpdates();
    await this.flushRankVotes();
    await this.flushFavorites();
    await this.flushOwnerships();
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
    if (this.favoriteBuffer.length >= BATCH_SIZE || this.ownershipBuffer.length >= BATCH_SIZE) {
      await this.flushCore();
      await this.flushUpdates();
      await this.flushRankVotes();
      await this.flushFavorites();
      await this.flushOwnerships();
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

  private pushFavorite(row: NewObjectFavorite): void {
    this.favoriteBuffer.push(row);
    this.stats.favoriteRowsBuffered += 1;
  }

  private pushOwnership(row: NewObjectOwnership): void {
    this.ownershipBuffer.push(row);
    this.stats.ownershipRowsBuffered += 1;
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
      created_at:
        parseMongoCreatedAt(doc.createdAt) ??
        dateFromMongoObjectIdHex(mongoIdToString(doc._id)) ??
        undefined,
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
    const fieldBody = normalizeLegacyFieldBody(field.body);
    if (
      updateType === UPDATE_TYPES.AFFILIATE_CODE &&
      shouldSkipLegacyAffiliateCode(fieldBody)
    ) {
      this.stats.fieldsSkippedAffiliateDomainScope += 1;
      return;
    }

    const localeRaw = field.locale?.trim();
    const locale = localeRaw && localeRaw.length > 0 ? localeRaw : null;

    let value_text: string | null = null;
    let value_json: unknown | null = null;
    let value_geo: ReturnType<typeof sql> | null = null;

    if (def.value_kind === 'object_ref') {
      const refResult = migrateObjectRefBodyToText(fieldBody, updateType);
      if (!refResult.ok) {
        this.stats.fieldsSkippedBadPayload += 1;
        return;
      }
      value_text = refResult.value;
    } else if (def.value_kind === 'text') {
      value_text = fieldBody;
    } else if (def.value_kind === 'geo') {
      const parsed = parseGeoPointFromBody(fieldBody);
      if (!parsed) {
        this.stats.fieldsSkippedBadPayload += 1;
        return;
      }
      value_geo = sql`ST_GeomFromGeoJSON(${parsed.geoJsonText}::text)::geography`;
    } else {
      const telephone = transformTelephoneFromField(updateType, field);
      const promoSale = transformPromotionSaleFromField(updateType, field);
      const tagCategoryItem = transformTagCategoryItemFromField(updateType, field);
      const imageGalleryItem = transformImageGalleryItemFromField(
        updateType,
        field,
        galleryAlbumIdToName,
      );
      if (telephone !== null) {
        if (!telephone.ok) {
          this.stats.fieldsSkippedBadPayload += 1;
          return;
        }
        value_json = telephone.value;
      } else if (promoSale !== null) {
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
          fieldBody,
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
              event_seq: legacyEventSeqFromObjectIdHex(fieldId),
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
            this.ensureCreatorForVoteIfAbsent(
              objectId,
              fieldId + suffix,
              fieldCreator,
              fieldTxId,
              legacyEventSeqFromObjectIdHex(fieldId),
              field.active_votes,
            );
          }
          return;
        }

        const jsonResult = transformJsonBody(legacyName, updateType, fieldBody);
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
      event_seq: legacyEventSeqFromObjectIdHex(fieldId),
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
    this.ensureCreatorForVoteIfAbsent(
      objectId,
      fieldId,
      fieldCreator,
      fieldTxId,
      legacyEventSeqFromObjectIdHex(fieldId),
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
    const mapped = mapMongoAuthorityField(objectId, field);
    if (mapped.kind === 'skip') {
      this.stats.fieldsSkippedAuthorityInvalid += 1;
      return;
    }
    if (mapped.kind === 'favorite') {
      this.pushFavorite(mapped.row);
      return;
    }
    this.pushOwnership(mapped.row);
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
      const voteOidHex = mongoIdToString(vote._id);
      this.pushVote({
        update_id: updateId,
        object_id: objectId,
        voter,
        vote: voteValue,
        event_seq: legacyEventSeqFromObjectIdHex(voteOidHex),
        transaction_id: buildVoteLegacyTransactionId(voteOidHex, fieldAuthor, permlink, voter),
      });
    }
  }

  /**
   * Mirrors chain-indexer update_create creator auto-for (createIfAbsent).
   * @see apps/chain-indexer/src/domain/odl-parser/handlers/update-create.handler.ts
   */
  private ensureCreatorForVoteIfAbsent(
    objectId: string,
    updateId: string,
    fieldCreator: string,
    fieldTxId: string,
    eventSeq: bigint,
    votes: MongoWObjectField['active_votes'],
  ): void {
    if (mongoActiveVotesHasVoter(votes, fieldCreator)) {
      this.stats.creatorVotesSkippedAlreadyPresent += 1;
      return;
    }
    this.pushVote({
      update_id: updateId,
      object_id: objectId,
      voter: fieldCreator,
      vote: 'for',
      event_seq: eventSeq,
      transaction_id: fieldTxId,
    });
    this.stats.creatorVotesAdded += 1;
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
      const rankVoteOidHex = mongoIdToString(rv._id);
      this.pushRankVote({
        update_id: updateId,
        object_id: objectId,
        voter,
        rank: odlRank,
        rank_context: LEGACY_RANK_CONTEXT,
        event_seq: legacyEventSeqFromObjectIdHex(rankVoteOidHex),
        transaction_id: buildRankVoteLegacyTransactionId(
          rankVoteOidHex,
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

function isPgToastCorruption(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current != null; depth++) {
    if (typeof current === 'object' && 'code' in current) {
      if ((current as { code?: string }).code === 'XX001') {
        return true;
      }
    }
    const msg = current instanceof Error ? current.message : String(current);
    if (msg.includes('pg_toast') || msg.includes('missing chunk number')) {
      return true;
    }
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}

async function runIndexStep(
  label: string,
  errors: Error[],
  fn: () => Promise<unknown>,
): Promise<void> {
  try {
    await fn();
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error(`Index step failed (${label}):`, err.message);
    errors.push(err);
  }
}

async function rebuildSearchVectorSkippingCorrupt(
  db: Kysely<OdlDatabase>,
): Promise<void> {
  try {
    await sql`
      UPDATE object_updates
      SET search_vector = to_tsvector('english', value_text)
      WHERE value_text IS NOT NULL
        AND update_type IN ('name', 'title', 'description')
        AND search_vector IS NULL
    `.execute(db);
    return;
  } catch (e) {
    if (!isPgToastCorruption(e)) {
      throw e;
    }
    console.error(
      'Bulk search_vector rebuild hit TOAST corruption (XX001); retrying per row...',
    );
  }

  await sql`
    DO $rebuild$
    DECLARE
      rec RECORD;
      skipped int := 0;
      rebuilt int := 0;
    BEGIN
      FOR rec IN
        SELECT update_id
        FROM object_updates
        WHERE value_text IS NOT NULL
          AND update_type IN ('name', 'title', 'description')
          AND search_vector IS NULL
      LOOP
        BEGIN
          UPDATE object_updates
          SET search_vector = to_tsvector('english', value_text)
          WHERE update_id = rec.update_id;
          rebuilt := rebuilt + 1;
        EXCEPTION
          WHEN data_corrupted THEN
            skipped := skipped + 1;
            RAISE WARNING 'search_vector skip update_id=%', rec.update_id;
        END;
      END LOOP;
      RAISE NOTICE 'search_vector rebuilt=% skipped_corrupt=%', rebuilt, skipped;
    END
    $rebuild$;
  `.execute(db);
}

async function clearUnreadableSearchVectors(
  db: Kysely<OdlDatabase>,
): Promise<void> {
  await sql`
    DO $sanitize$
    DECLARE
      rec RECORD;
      skipped int := 0;
    BEGIN
      FOR rec IN
        SELECT update_id FROM object_updates WHERE search_vector IS NOT NULL
      LOOP
        BEGIN
          PERFORM search_vector FROM object_updates WHERE update_id = rec.update_id;
        EXCEPTION
          WHEN data_corrupted THEN
            skipped := skipped + 1;
            BEGIN
              UPDATE object_updates
              SET search_vector = NULL
              WHERE update_id = rec.update_id;
            EXCEPTION
              WHEN OTHERS THEN
                DELETE FROM object_updates WHERE update_id = rec.update_id;
            END;
            RAISE WARNING 'cleared corrupt search_vector update_id=%', rec.update_id;
        END;
      END LOOP;
      RAISE NOTICE 'corrupt search_vector cleared=%', skipped;
    END
    $sanitize$;
  `.execute(db);
}

async function dropObjectUpdatesIndexes(db: Kysely<OdlDatabase>): Promise<void> {
  console.log('Dropping object migration indexes and object_updates trigger...');
  await sql`ALTER TABLE object_updates DISABLE TRIGGER tr_object_updates_search_vector`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_search_vector`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_name_title_value_norm_trgm`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_tagitem_value`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_object_rank_score`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_value_geo`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_update_type_value_text`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_update_type_value_text_normalized`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_object_id_update_type`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_address_locality_lower`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_updates_identifier_value_lower`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_favorite_object_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_favorite_account`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_ownership_object_id_type`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_ownership_object_id_type_created_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_object_ownership_account`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_rank_votes_object_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_validity_votes_object_id`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_meta_group_id_active`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_type_created_at`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_type_seq`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_status`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_object_type_weight`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_creator`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_canonical`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_objects_core_canonical_creator`.execute(db);
  console.log('Indexes dropped.');
}

async function recreateObjectUpdatesIndexes(db: Kysely<OdlDatabase>): Promise<void> {
  console.log('Recreating object migration indexes...');
  const errors: Error[] = [];

  await runIndexStep('objects_core.object_type_weight', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_objects_core_object_type_weight ON objects_core (object_type, weight DESC NULLS LAST)`.execute(db),
  );
  await runIndexStep('objects_core.creator', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_objects_core_creator ON objects_core (creator)`.execute(db),
  );
  await runIndexStep('objects_core.canonical', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_objects_core_canonical
      ON objects_core (canonical)
      WHERE canonical IS NOT NULL
    `.execute(db),
  );
  await runIndexStep('objects_core.canonical_creator', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_objects_core_canonical_creator
      ON objects_core (canonical_creator)
      WHERE canonical_creator IS NOT NULL
    `.execute(db),
  );
  await runIndexStep('objects_core.status', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_objects_core_status
      ON objects_core (status)
      WHERE status <> 'active'
    `.execute(db),
  );
  await runIndexStep('objects_core.type_seq', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_objects_core_type_seq
      ON objects_core (object_type, seq DESC)
      WHERE status = 'active'
    `.execute(db),
  );
  await runIndexStep('objects_core.type_created_at', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_objects_core_type_created_at
      ON objects_core (object_type, created_at DESC)
      WHERE status = 'active'
    `.execute(db),
  );
  await runIndexStep('objects_core.meta_group_id_active', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_objects_core_meta_group_id_active
      ON objects_core (meta_group_id)
      WHERE status = 'active' AND meta_group_id IS NOT NULL
    `.execute(db),
  );
  console.log('  objects_core secondary indexes done');
  await runIndexStep('validity_votes.object_id', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_validity_votes_object_id ON validity_votes (object_id)`.execute(db),
  );
  await runIndexStep('rank_votes.object_id', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_rank_votes_object_id ON rank_votes (object_id)`.execute(db),
  );
  await runIndexStep('object_favorite.account', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_object_favorite_account ON object_favorite (account)`.execute(db),
  );
  await runIndexStep('object_favorite.object_id', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_object_favorite_object_id ON object_favorite (object_id)`.execute(db),
  );
  await runIndexStep('object_ownership.object_id_type', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_object_ownership_object_id_type
      ON object_ownership (object_id, ownership_type)
    `.execute(db),
  );
  await runIndexStep('object_ownership.object_id_type_created_at', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_object_ownership_object_id_type_created_at
      ON object_ownership (object_id, ownership_type, created_at DESC)
    `.execute(db),
  );
  await runIndexStep('object_ownership.account', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_object_ownership_account ON object_ownership (account)`.execute(db),
  );
  console.log('  validity_votes / rank_votes / object_favorite / object_ownership indexes done');
  await runIndexStep('object_updates.object_id_update_type', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_object_updates_object_id_update_type ON object_updates (object_id, update_type)`.execute(db),
  );
  await runIndexStep('object_updates.value_geo', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_object_updates_value_geo ON object_updates USING GIST (value_geo)`.execute(db),
  );
  await runIndexStep('object_updates.update_type_value_text', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_object_updates_update_type_value_text ON object_updates (update_type, LEFT(value_text, 2048)) WHERE value_text IS NOT NULL`.execute(db),
  );
  await runIndexStep('object_updates.update_type_value_text_normalized', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_object_updates_update_type_value_text_normalized ON object_updates (update_type, LEFT(value_text_normalized, 2048)) WHERE value_text_normalized IS NOT NULL`.execute(db),
  );
  await runIndexStep('object_updates.object_rank_score', errors, () =>
    sql`CREATE INDEX IF NOT EXISTS idx_object_updates_object_rank_score ON object_updates (object_id, rank_score)`.execute(db),
  );
  await runIndexStep('object_updates.tagitem_value', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_object_updates_tagitem_value
      ON object_updates ((value_json->>'value'), (value_json->>'category'))
      WHERE update_type = 'tagCategoryItem'
    `.execute(db),
  );
  await runIndexStep('object_updates.identifier_value_lower', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_object_updates_identifier_value_lower
      ON object_updates (lower(value_json->>'value') text_pattern_ops)
      WHERE update_type = 'identifier' AND value_json->>'value' IS NOT NULL
    `.execute(db),
  );
  await runIndexStep('object_updates.address_locality_lower', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_object_updates_address_locality_lower
      ON object_updates (lower(value_json->>'locality') text_pattern_ops)
      WHERE update_type = 'address' AND value_json->>'locality' IS NOT NULL
    `.execute(db),
  );
  console.log('  object_updates btree/geo/rank indexes done');
  await runIndexStep('object_updates.enable_search_vector_trigger', errors, () =>
    sql`ALTER TABLE object_updates ENABLE TRIGGER tr_object_updates_search_vector`.execute(db),
  );
  await runIndexStep('object_updates.rebuild_search_vector', errors, () =>
    rebuildSearchVectorSkippingCorrupt(db),
  );
  await runIndexStep('object_updates.search_vector_gin', errors, async () => {
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_object_updates_search_vector ON object_updates USING GIN (search_vector)`.execute(db);
    } catch (e) {
      if (!isPgToastCorruption(e)) {
        throw e;
      }
      console.error(
        'GIN search_vector index hit TOAST corruption; clearing unreadable search_vector rows and retrying...',
      );
      await clearUnreadableSearchVectors(db);
      await sql`CREATE INDEX IF NOT EXISTS idx_object_updates_search_vector ON object_updates USING GIN (search_vector)`.execute(db);
    }
  });
  console.log('  object_updates search_vector GIN done');
  await runIndexStep('pg_trgm', errors, () =>
    sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`.execute(db),
  );
  await runIndexStep('object_updates.name_title_trgm', errors, () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_object_updates_name_title_value_norm_trgm
      ON object_updates USING GIN (value_text_normalized gin_trgm_ops)
      WHERE update_type IN ('name', 'title') AND value_text_normalized IS NOT NULL
    `.execute(db),
  );
  console.log('  object_updates name/title trigram GIN done');

  if (errors.length > 0) {
    throw new Error(
      `Index recreation finished with ${errors.length} failed step(s): ${errors.map((e) => e.message).join(' | ')}`,
    );
  }
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

  let importError: unknown = null;

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
  } catch (err) {
    importError = err;
    console.error('Object import failed:', err);
    console.error('Partial stats:', migrator.stats);
  } finally {
    if (skipIndexes) {
      try {
        await recreateObjectUpdatesIndexes(migrator.db);
      } catch (recreateErr) {
        console.error('Index recreation failed:', recreateErr);
        importError = importError ?? recreateErr;
      }
    }
    await migrator.destroy();
  }

  if (importError instanceof Error) {
    throw importError;
  }
  if (importError != null) {
    fail(String(importError));
  }

  console.log('Migration finished. Stats:', migrator.stats);
}

async function recreateIndexesStandalone(): Promise<void> {
  const databaseUrl = resolveConnectionString();
  const migrator = new MongoToPgMigrator(databaseUrl);
  try {
    await recreateObjectUpdatesIndexes(migrator.db);
  } finally {
    await migrator.destroy();
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const recreateIndexesOnly = args.includes('--recreate-indexes');
  const fileArg = args.find((a) => !a.startsWith('--'));
  const skipIndexes = args.includes('--skip-indexes');

  if (recreateIndexesOnly) {
    recreateIndexesStandalone().catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
    return;
  }

  if (!fileArg?.trim()) {
    fail(
      'Usage: tsx scripts/migrate-mongo-to-pg/objects/index.ts <path-to-wobjects.json> [--skip-indexes]\n' +
        '       tsx scripts/migrate-mongo-to-pg/objects/index.ts --recreate-indexes',
    );
  }

  migrateFile(fileArg, skipIndexes).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}

main();
