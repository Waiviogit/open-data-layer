/**
 * Stream MongoDB wobject JSON array export into ODL Postgres tables.
 * Usage: pnpm migrate:mongo <path-to.json>
 * Requires DATABASE_URL (e.g. via .env with tsx --env-file).
 */

import * as fs from 'fs';
import * as path from 'path';

import type {
  NewObjectAuthority,
  NewObjectsCore,
  NewObjectUpdate,
  NewValidityVote,
  OdlDatabase,
} from '../../libs/core/src/db';
import { OBJECT_TYPE_REGISTRY } from '../../libs/core/src/object-type-registry';
import { UPDATE_REGISTRY } from '../../libs/core/src/update-registry';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import streamArray from 'stream-json/streamers/stream-array.js';

import {
  AUTHORITY_LEGACY_FIELD_NAME,
  SKIP_LEGACY_FIELD_NAMES,
  resolveUpdateType,
} from './field-name-map';
import type { MongoWObject, MongoWObjectField } from './types';
import { createdAtUnixFromObjectId, mongoIdToString } from './utils';
import { transformJsonBody } from './value-strategies';

const BATCH_SIZE = 500;
const LEGACY_EVENT_SEQ = BigInt(0);

const AUTHORITY_TYPES = new Set<string>(['ownership', 'administrative']);

type InsertUpdateRow = Omit<
  NewObjectUpdate,
  'value_geo' | 'value_text' | 'value_json'
> & {
  value_text: string | null;
  value_json: unknown | null;
  value_geo: ReturnType<typeof sql> | null;
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

/**
 * Accepts GeoJSON Point in `body` or legacy Waivio-style
 * `{"latitude": number, "longitude": number}` (order → [lon, lat] for PostGIS).
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
    const [lon, lat] = o.coordinates;
    if (typeof lon !== 'number' || typeof lat !== 'number') {
      return null;
    }
    return geoJsonPointText(lon, lat);
  }

  const lat = o.latitude;
  const lon = o.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
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

class MongoToPgMigrator {
  private readonly db: Kysely<OdlDatabase>;

  private coreBuffer: NewObjectsCore[] = [];

  private updateBuffer: InsertUpdateRow[] = [];

  private authorityBuffer: NewObjectAuthority[] = [];

  private voteBuffer: NewValidityVote[] = [];

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
    await this.db
      .insertInto('object_updates')
      .values(chunk as NewObjectUpdate[])
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

  /** FK-safe order: core → updates & authority → votes. */
  async flushAll(): Promise<void> {
    await this.flushCore();
    await this.flushUpdates();
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
    }
    if (this.authorityBuffer.length >= BATCH_SIZE) {
      await this.flushCore();
      await this.flushAuthority();
    }
    if (this.voteBuffer.length >= BATCH_SIZE) {
      await this.flushCore();
      await this.flushUpdates();
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
    for (const field of fields) {
      this.processField(doc, authorPermlink, creator, author, field);
    }
  }

  private processField(
    doc: MongoWObject,
    objectId: string,
    objectCreator: string,
    objectAuthor: string,
    field: MongoWObjectField,
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

    if (def.value_kind === 'text') {
      const body = field.body ?? '';
      value_text = body;
    } else if (def.value_kind === 'geo') {
      const parsed = parseGeoPointFromBody(field.body);
      if (!parsed) {
        this.stats.fieldsSkippedBadPayload += 1;
        return;
      }
      value_geo = sql`ST_GeogFromGeoJSON(${parsed.geoJsonText})`;
    } else {
      const jsonResult = transformJsonBody(legacyName, updateType, field.body ?? '');
      if (!jsonResult.ok) {
        this.stats.fieldsSkippedBadPayload += 1;
        return;
      }
      value_json = jsonResult.value;
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
  }

  private processAuthorityField(objectId: string, field: MongoWObjectField): void {
    const body = field.body?.trim();
    const account = field.creator?.trim();
    if (!body || !AUTHORITY_TYPES.has(body) || !account) {
      this.stats.fieldsSkippedAuthorityInvalid += 1;
      return;
    }
    this.pushAuthority({
      object_id: objectId,
      account,
      authority_type: body as 'ownership' | 'administrative',
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

  const migrator = new MongoToPgMigrator(databaseUrl);

  await new Promise<void>((resolve, reject) => {
    const pipeline = streamArray.withParserAsStream();
    const stream = fs.createReadStream(resolved, { encoding: 'utf8' });

    stream.on('error', reject);
    pipeline.on('error', reject);

    let chain = Promise.resolve();

    pipeline.on('data', (item: { key: number; value: MongoWObject }) => {
      chain = chain
        .then(async () => {
          migrator.processWObject(item.value);
          await migrator.flushAfterObjectIfNeeded();
          if ((item.key + 1) % 1000 === 0) {
            console.log(`Processed ${item.key + 1} objects...`);
          }
        })
        .catch(reject);
    });

    pipeline.on('end', () => {
      void chain
        .then(() => resolve())
        .catch(reject);
    });

    stream.pipe(pipeline);
  });

  await migrator.flushAll();
  await migrator.destroy();

  console.log('Migration finished. Stats:', migrator.stats);
}

function main(): void {
  const fileArg = process.argv[2];
  if (!fileArg?.trim()) {
    fail('Usage: tsx scripts/migrate-mongo-to-pg/index.ts <path-to-wobjects.json>');
  }

  migrateFile(fileArg).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}

main();
