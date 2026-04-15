import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { HiveAccountType } from '@opden-data-layer/clients';
import type {
  AccountCurrent,
  NewAccountCurrent,
  AccountCurrentUpdate,
} from '@opden-data-layer/core';
import { profileAliasAndImageFromHiveStrings } from '../domain/hive-social/account-hive-metadata.util';

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

  /**
   * Upserts Hive-sourced account fields from `condenser_api.get_accounts`.
   * Does not overwrite ODL-managed columns: object_reputation, wobjects_weight, stage_version,
   * referral_status, last_activity, last_posts_count, users_following_count, followers_count.
   */
  async upsertFromHive(hive: HiveAccountType): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const jm = typeof hive.json_metadata === 'string' ? hive.json_metadata : '';
    const pjm =
      typeof hive.posting_json_metadata === 'string' ? hive.posting_json_metadata : '';
    const { alias, profile_image } = profileAliasAndImageFromHiveStrings(pjm, jm);

    const hiveFields = {
      hive_id: hive.id,
      json_metadata: jm.length > 0 ? jm : null,
      posting_json_metadata: pjm.length > 0 ? pjm : null,
      created: hive.created?.trim() ? hive.created : null,
      comment_count: Math.trunc(Number(hive.comment_count)) || 0,
      lifetime_vote_count: Math.trunc(Number(hive.lifetime_vote_count)) || 0,
      post_count: Math.trunc(Number(hive.post_count)) || 0,
      last_post: hive.last_post?.trim() ? hive.last_post : null,
      last_root_post: hive.last_root_post?.trim() ? hive.last_root_post : null,
      updated_at_unix: now,
      alias: alias.length > 0 ? alias : null,
      profile_image,
    };

    const insertRow: NewAccountCurrent = {
      name: hive.name,
      ...hiveFields,
      object_reputation: 0,
      wobjects_weight: 0,
      last_posts_count: 0,
      users_following_count: 0,
      followers_count: 0,
      stage_version: 0,
      referral_status: null,
      last_activity: null,
    };

    await this.db
      .insertInto('accounts_current')
      .values(insertRow)
      .onConflict((oc) => oc.column('name').doUpdateSet(hiveFields))
      .execute();
  }

  async delete(name: string) {
    return this.db
      .deleteFrom('accounts_current')
      .where('name', '=', name)
      .returningAll()
      .executeTakeFirst();
  }
}
