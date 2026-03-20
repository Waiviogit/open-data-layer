import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  AccountCurrent,
  NewAccountCurrent,
  AccountCurrentUpdate,
} from '@opden-data-layer/core';

@Injectable()
export class AccountsCurrentRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByName(name: string) {
    return this.db
      .selectFrom('accounts_current')
      .where('name', '=', name)
      .selectAll()
      .executeTakeFirst();
  }

  async find(criteria: Partial<AccountCurrent>) {
    let query = this.db.selectFrom('accounts_current');

    if (criteria.name !== undefined) {
      query =
        criteria.name === null
          ? query.where('name', 'is', null)
          : query.where('name', '=', criteria.name);
    }
    if (criteria.hive_id !== undefined) {
      query =
        criteria.hive_id === null
          ? query.where('hive_id', 'is', null)
          : query.where('hive_id', '=', criteria.hive_id);
    }
    if (criteria.json_metadata !== undefined) {
      query =
        criteria.json_metadata === null
          ? query.where('json_metadata', 'is', null)
          : query.where('json_metadata', '=', criteria.json_metadata);
    }
    if (criteria.posting_json_metadata !== undefined) {
      query =
        criteria.posting_json_metadata === null
          ? query.where('posting_json_metadata', 'is', null)
          : query.where('posting_json_metadata', '=', criteria.posting_json_metadata);
    }
    if (criteria.created !== undefined) {
      query =
        criteria.created === null
          ? query.where('created', 'is', null)
          : query.where('created', '=', criteria.created);
    }
    if (criteria.comment_count !== undefined) {
      query = query.where('comment_count', '=', criteria.comment_count);
    }
    if (criteria.lifetime_vote_count !== undefined) {
      query = query.where('lifetime_vote_count', '=', criteria.lifetime_vote_count);
    }
    if (criteria.post_count !== undefined) {
      query = query.where('post_count', '=', criteria.post_count);
    }
    if (criteria.last_post !== undefined) {
      query =
        criteria.last_post === null
          ? query.where('last_post', 'is', null)
          : query.where('last_post', '=', criteria.last_post);
    }
    if (criteria.last_root_post !== undefined) {
      query =
        criteria.last_root_post === null
          ? query.where('last_root_post', 'is', null)
          : query.where('last_root_post', '=', criteria.last_root_post);
    }
    if (criteria.object_reputation !== undefined) {
      query = query.where('object_reputation', '=', criteria.object_reputation);
    }
    if (criteria.updated_at_unix !== undefined) {
      query =
        criteria.updated_at_unix === null
          ? query.where('updated_at_unix', 'is', null)
          : query.where('updated_at_unix', '=', criteria.updated_at_unix);
    }

    return query.selectAll().execute();
  }

  async update(name: string, updateWith: AccountCurrentUpdate) {
    await this.db
      .updateTable('accounts_current')
      .set(updateWith)
      .where('name', '=', name)
      .execute();
  }

  async create(row: NewAccountCurrent) {
    return this.db
      .insertInto('accounts_current')
      .values(row)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(name: string) {
    return this.db
      .deleteFrom('accounts_current')
      .where('name', '=', name)
      .returningAll()
      .executeTakeFirst();
  }
}
