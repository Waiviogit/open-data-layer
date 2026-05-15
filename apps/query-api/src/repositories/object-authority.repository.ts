import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type {
  ObjectAuthority,
  NewObjectAuthority,
} from '@opden-data-layer/core';
import type { UserSubscriptionSort, SubscriptionJoinedAccountRow } from './user-subscriptions.repository';

@Injectable()
export class ObjectAuthorityRepository {
  private readonly logger = new Logger(ObjectAuthorityRepository.name);

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

  /**
   * Object ids where `account` holds `administrative` authority (for linked-object heart UI).
   */
  async findAdministrativeObjectIdsForAccount(account: string, objectIds: string[]): Promise<string[]> {
    return this.findObjectIdsForAccountAndAuthorityType(account, objectIds, 'administrative');
  }

  /**
   * Object ids where `account` holds `ownership` authority.
   */
  async findOwnershipObjectIdsForAccount(account: string, objectIds: string[]): Promise<string[]> {
    return this.findObjectIdsForAccountAndAuthorityType(account, objectIds, 'ownership');
  }

  private async findObjectIdsForAccountAndAuthorityType(
    account: string,
    objectIds: string[],
    authorityType: ObjectAuthority['authority_type'],
  ): Promise<string[]> {
    if (objectIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .selectFrom('object_authority')
      .where('account', '=', account)
      .where('authority_type', '=', authorityType)
      .where('object_id', 'in', objectIds)
      .select('object_id')
      .execute();
    return rows.map((r) => r.object_id);
  }

  async countByObjectIdAndType(
    objectId: string,
    authorityType: ObjectAuthority['authority_type'],
  ): Promise<number> {
    try {
      const row = await this.db
        .selectFrom('object_authority')
        .where('object_id', '=', objectId)
        .where('authority_type', '=', authorityType)
        .select(sql<number>`count(*)::int`.as('c'))
        .executeTakeFirst();
      return Number(row?.c ?? 0);
    } catch (e) {
      this.logger.error((e as Error).message);
      return 0;
    }
  }

  /**
   * Accounts with authority on `object_id`, joined to `accounts_current`, subscription-list sorts + pagination.
   */
  async findAccountsByObjectIdAndType(
    objectId: string,
    authorityType: ObjectAuthority['authority_type'],
    sort: UserSubscriptionSort,
    skip: number,
    limit: number,
  ): Promise<SubscriptionJoinedAccountRow[]> {
    try {
      const qb = this.db
        .selectFrom('object_authority as oa')
        .innerJoin('accounts_current as ac', (join) =>
          join.onRef('oa.account', '=', 'ac.name'),
        )
        .where('oa.object_id', '=', objectId)
        .where('oa.authority_type', '=', authorityType)
        .select([
          sql<string>`ac.name`.as('name'),
          sql<string | null>`ac.profile_image`.as('profile_image'),
          sql<number>`ac.wobjects_weight`.as('wobjects_weight'),
          sql<number>`ac.users_following_count`.as('users_following_count'),
        ]);

      const ordered =
        sort === 'followers'
          ? qb.orderBy(sql`ac.users_following_count`, 'desc').orderBy(sql`ac.name`, 'asc')
          : sort === 'a-z'
            ? qb.orderBy(sql`ac.name`, 'asc')
            : sort === 'recency'
              ? qb.orderBy(sql`oa.created_at`, 'desc').orderBy(sql`ac.name`, 'asc')
              : qb.orderBy(sql`ac.wobjects_weight desc nulls last`).orderBy(sql`ac.name`, 'asc');

      return await ordered.offset(skip).limit(limit).execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }
}
