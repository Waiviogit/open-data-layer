import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { ObjectCategoriesRelatedRow } from '@opden-data-layer/core';
import { buildUserScopeKey } from '@opden-data-layer/core';

@Injectable()
export class ObjectCategoriesRelatedRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByUserScope(
    username: string,
    types: readonly string[],
  ): Promise<ObjectCategoriesRelatedRow[]> {
    const name = username.trim();
    if (name.length === 0) {
      return [];
    }
    const scopeKey = buildUserScopeKey(name, types);
    return this.db
      .selectFrom('object_categories_related')
      .where('scope_type', '=', 'user')
      .where('scope_key', '=', scopeKey)
      .selectAll()
      .execute();
  }
}
