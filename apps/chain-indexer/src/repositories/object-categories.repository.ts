import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  NewObjectCategoriesRow,
  ObjectCategoriesRowUpdate,
} from '@opden-data-layer/core';

@Injectable()
export class ObjectCategoriesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByObjectId(objectId: string) {
    return this.db
      .selectFrom('object_categories')
      .where('object_id', '=', objectId)
      .selectAll()
      .executeTakeFirst();
  }

  async upsert(row: NewObjectCategoriesRow): Promise<void> {
    const patch: ObjectCategoriesRowUpdate = {
      meta_group_id: row.meta_group_id,
      category_names: row.category_names,
      updated_at_seq: row.updated_at_seq,
    };
    await this.db
      .insertInto('object_categories')
      .values(row)
      .onConflict((oc) => oc.column('object_id').doUpdateSet(patch))
      .execute();
  }
}
