import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';

export type TagCategoryItemRow = {
  category: string;
  value: string;
};

@Injectable()
export class ObjectTagCategoryItemsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async replaceForObject(
    objectId: string,
    objectType: string,
    items: TagCategoryItemRow[],
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('object_tag_category_items')
        .where('object_id', '=', objectId)
        .execute();

      if (items.length === 0) {
        return;
      }

      await trx
        .insertInto('object_tag_category_items')
        .values(
          items.map((item) => ({
            object_id: objectId,
            object_type: objectType,
            category: item.category,
            value: item.value,
          })),
        )
        .execute();
    });
  }
}
