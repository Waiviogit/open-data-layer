import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  ObjectsCore,
  NewObjectsCore,
  ObjectsCoreUpdate,
} from '@opden-data-layer/core';

const OBJECT_ID_IN_CHUNK = 400;

@Injectable()
export class ObjectsCoreRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Returns object_type per existing object_id (batched). Unknown ids are omitted.
   */
  async findObjectTypesByIds(
    objectIds: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(objectIds.map((id) => id.trim()).filter(Boolean))];
    const out = new Map<string, string>();
    for (let i = 0; i < unique.length; i += OBJECT_ID_IN_CHUNK) {
      const chunk = unique.slice(i, i + OBJECT_ID_IN_CHUNK);
      if (chunk.length === 0) {
        continue;
      }
      const rows = await this.db
        .selectFrom('objects_core')
        .select(['object_id', 'object_type'])
        .where('object_id', 'in', chunk)
        .execute();
      for (const r of rows) {
        out.set(r.object_id, r.object_type);
      }
    }
    return out;
  }

  async findByObjectId(objectId: string) {
    return this.db
      .selectFrom('objects_core')
      .where('object_id', '=', objectId)
      .selectAll()
      .executeTakeFirst();
  }

  async find(criteria: Partial<ObjectsCore>) {
    let query = this.db.selectFrom('objects_core');

    if (criteria.object_id !== undefined) {
      query =
        criteria.object_id === null
          ? query.where('object_id', 'is', null)
          : query.where('object_id', '=', criteria.object_id);
    }
    if (criteria.object_type !== undefined) {
      query =
        criteria.object_type === null
          ? query.where('object_type', 'is', null)
          : query.where('object_type', '=', criteria.object_type);
    }
    if (criteria.creator !== undefined) {
      query =
        criteria.creator === null
          ? query.where('creator', 'is', null)
          : query.where('creator', '=', criteria.creator);
    }
    if (criteria.weight !== undefined) {
      query =
        criteria.weight === null
          ? query.where('weight', 'is', null)
          : query.where('weight', '=', criteria.weight);
    }
    if (criteria.meta_group_id !== undefined) {
      query =
        criteria.meta_group_id === null
          ? query.where('meta_group_id', 'is', null)
          : query.where('meta_group_id', '=', criteria.meta_group_id);
    }
    if (criteria.transaction_id !== undefined) {
      query =
        criteria.transaction_id === null
          ? query.where('transaction_id', 'is', null)
          : query.where('transaction_id', '=', criteria.transaction_id);
    }
    if (criteria.seq !== undefined) {
      query = query.where('seq', '=', criteria.seq);
    }

    return query.selectAll().execute();
  }

  async update(objectId: string, updateWith: ObjectsCoreUpdate) {
    await this.db
      .updateTable('objects_core')
      .set(updateWith)
      .where('object_id', '=', objectId)
      .execute();
  }

  async create(row: NewObjectsCore) {
    return this.db
      .insertInto('objects_core')
      .values(row)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(objectId: string) {
    return this.db
      .deleteFrom('objects_core')
      .where('object_id', '=', objectId)
      .returningAll()
      .executeTakeFirst();
  }
}
