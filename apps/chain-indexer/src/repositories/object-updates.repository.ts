import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  ObjectUpdate,
  NewObjectUpdate,
  ObjectUpdateUpdate,
} from '@opden-data-layer/core';

@Injectable()
export class ObjectUpdatesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByUpdateId(updateId: string) {
    return this.db
      .selectFrom('object_updates')
      .where('update_id', '=', updateId)
      .selectAll()
      .executeTakeFirst();
  }

  async find(criteria: Partial<ObjectUpdate>) {
    let query = this.db.selectFrom('object_updates');

    if (criteria.update_id !== undefined) {
      query =
        criteria.update_id === null
          ? query.where('update_id', 'is', null)
          : query.where('update_id', '=', criteria.update_id);
    }
    if (criteria.object_id !== undefined) {
      query =
        criteria.object_id === null
          ? query.where('object_id', 'is', null)
          : query.where('object_id', '=', criteria.object_id);
    }
    if (criteria.update_type !== undefined) {
      query =
        criteria.update_type === null
          ? query.where('update_type', 'is', null)
          : query.where('update_type', '=', criteria.update_type);
    }
    if (criteria.creator !== undefined) {
      query =
        criteria.creator === null
          ? query.where('creator', 'is', null)
          : query.where('creator', '=', criteria.creator);
    }
    if (criteria.created_at_unix !== undefined) {
      query = query.where('created_at_unix', '=', criteria.created_at_unix);
    }
    if (criteria.event_seq !== undefined) {
      query = query.where('event_seq', '=', criteria.event_seq);
    }
    if (criteria.transaction_id !== undefined) {
      query =
        criteria.transaction_id === null
          ? query.where('transaction_id', 'is', null)
          : query.where('transaction_id', '=', criteria.transaction_id);
    }
    if (criteria.value_text !== undefined) {
      query =
        criteria.value_text === null
          ? query.where('value_text', 'is', null)
          : query.where('value_text', '=', criteria.value_text);
    }

    return query.selectAll().execute();
  }

  async update(updateId: string, updateWith: ObjectUpdateUpdate) {
    await this.db
      .updateTable('object_updates')
      .set(updateWith)
      .where('update_id', '=', updateId)
      .execute();
  }

  /**
   * True if this object already has an update with the same type and payload
   * in the column implied by value_kind (value_text | value_geo | value_json).
   */
  /**
   * At most one row per (object_id, update_type, creator) for single-cardinality types;
   * used to decide replace-on-resubmit in update_create.
   */
  async findByObjectTypeAndCreator(
    objectId: string,
    updateType: string,
    creator: string,
  ) {
    return this.db
      .selectFrom('object_updates')
      .where('object_id', '=', objectId)
      .where('update_type', '=', updateType)
      .where('creator', '=', creator)
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Inserts a new update row. When `replaceUpdateId` is set, deletes that row first
   * in the same transaction (validity/rank votes cascade from FK).
   */
  async createReplacingIfPresent(replaceUpdateId: string | undefined, row: NewObjectUpdate) {
    if (replaceUpdateId === undefined) {
      return this.create(row);
    }
    return this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('object_updates')
        .where('update_id', '=', replaceUpdateId)
        .execute();
      return trx
        .insertInto('object_updates')
        .values(row)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }

  async existsByObjectAndValue(
    objectId: string,
    updateType: string,
    valueKind: 'text' | 'geo' | 'json',
    value: unknown,
  ): Promise<boolean> {
    let query = this.db
      .selectFrom('object_updates')
      .select('update_id')
      .where('object_id', '=', objectId)
      .where('update_type', '=', updateType);

    if (valueKind === 'text') {
      query = query.where('value_text', '=', String(value));
    } else if (valueKind === 'json') {
      query = query.where(
        sql<boolean>`value_json = ${JSON.stringify(value)}::jsonb`,
      );
    } else {
      query = query.where(
        sql<boolean>`ST_Equals(
          value_geo::geometry,
          ST_GeomFromGeoJSON(${JSON.stringify(value)}::json)::geometry
        )`,
      );
    }

    const row = await query.executeTakeFirst();
    return row !== undefined;
  }

  /**
   * True if any row has identifier update_type with the same value + type keys.
   */
  async existsIdentifierByValueAndType(
    identifierValue: string,
    identifierType: string,
  ): Promise<boolean> {
    const row = await this.db
      .selectFrom('object_updates')
      .select('update_id')
      .where('update_type', '=', 'identifier')
      .where(sql<boolean>`value_json->>'value' = ${identifierValue}`)
      .where(sql<boolean>`value_json->>'type' = ${identifierType}`)
      .executeTakeFirst();
    return row !== undefined;
  }

  async create(row: NewObjectUpdate) {
    return this.db
      .insertInto('object_updates')
      .values(row)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(updateId: string) {
    return this.db
      .deleteFrom('object_updates')
      .where('update_id', '=', updateId)
      .returningAll()
      .executeTakeFirst();
  }
}
