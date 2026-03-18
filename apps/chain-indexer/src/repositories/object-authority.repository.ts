import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  ObjectAuthority,
  NewObjectAuthority,
} from '@opden-data-layer/core';

@Injectable()
export class ObjectAuthorityRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByObjectId(objectId: string) {
    return this.db
      .selectFrom('object_authority')
      .where('object_id', '=', objectId)
      .selectAll()
      .execute();
  }

  async find(criteria: Partial<ObjectAuthority>) {
    let query = this.db.selectFrom('object_authority');

    if (criteria.object_id !== undefined) {
      query = query.where('object_id', '=', criteria.object_id);
    }
    if (criteria.account !== undefined) {
      query = query.where('account', '=', criteria.account);
    }
    if (criteria.authority_type !== undefined) {
      query = query.where('authority_type', '=', criteria.authority_type);
    }

    return query.selectAll().execute();
  }

  /** Idempotent insert — no-op if the (object_id, account, authority_type) row already exists. */
  async create(row: NewObjectAuthority) {
    return this.db
      .insertInto('object_authority')
      .values(row)
      .onConflict((oc) => oc.doNothing())
      .returningAll()
      .executeTakeFirst();
  }

  async delete(objectId: string, account: string, authorityType: ObjectAuthority['authority_type']) {
    return this.db
      .deleteFrom('object_authority')
      .where('object_id', '=', objectId)
      .where('account', '=', account)
      .where('authority_type', '=', authorityType)
      .returningAll()
      .executeTakeFirst();
  }
}
