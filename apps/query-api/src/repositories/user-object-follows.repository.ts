import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { UserObjectFollow } from '@opden-data-layer/core';
import type { UserSubscriptionSort, SubscriptionJoinedAccountRow } from './user-subscriptions.repository';

export type UserObjectFollowSortMode = 'weight' | 'recency';

export interface ObjectFollowJoinedRow {
  object_id: string;
  /** From `objects_core.weight`. */
  weight: number | null;
}

@Injectable()
export class UserObjectFollowsRepository {
  private readonly logger = new Logger(UserObjectFollowsRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByAccountAndObject(
    account: string,
    objectId: string,
  ): Promise<UserObjectFollow | null> {
    try {
      const row = await this.db
        .selectFrom('user_object_follows')
        .selectAll()
        .where('account', '=', account)
        .where('object_id', '=', objectId)
        .executeTakeFirst();
      return row ?? null;
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  async countByObjectId(objectId: string): Promise<number> {
    try {
      const row = await this.db
        .selectFrom('user_object_follows')
        .where('object_id', '=', objectId)
        .select(sql<number>`count(*)::int`.as('c'))
        .executeTakeFirst();
      return Number(row?.c ?? 0);
    } catch (e) {
      this.logger.error((e as Error).message);
      return 0;
    }
  }

  async countByAccount(account: string): Promise<number> {
    try {
      const row = await this.db
        .selectFrom('user_object_follows')
        .where('account', '=', account)
        .select(sql<number>`count(*)::int`.as('c'))
        .executeTakeFirst();
      return Number(row?.c ?? 0);
    } catch (e) {
      this.logger.error((e as Error).message);
      return 0;
    }
  }

  async findObjectsByAccount(
    account: string,
    sort: UserObjectFollowSortMode,
    skip: number,
    limit: number,
  ): Promise<ObjectFollowJoinedRow[]> {
    try {
      const qb = this.db
        .selectFrom('user_object_follows as uof')
        .innerJoin('objects_core as oc', (join) =>
          join
            .onRef('uof.object_id', '=', 'oc.object_id')
            .on('oc.status', '=', 'active'),
        )
        .where('uof.account', '=', account)
        .select([
          sql<string>`uof.object_id`.as('object_id'),
          sql<number | null>`oc.weight`.as('weight'),
        ]);

      const ordered =
        sort === 'recency'
          ? qb.orderBy(sql`uof.created_at`, 'desc').orderBy(sql`uof.object_id`, 'asc')
          : qb
              .orderBy(sql`oc.weight desc nulls last`)
              .orderBy(sql`uof.object_id`, 'asc');

      return await ordered.offset(skip).limit(limit).execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  /**
   * Accounts following `object_id` (joined to `accounts_current`), with subscription-style sort + pagination.
   */
  async findFollowersByObjectId(
    objectId: string,
    sort: UserSubscriptionSort,
    skip: number,
    limit: number,
  ): Promise<SubscriptionJoinedAccountRow[]> {
    try {
      const qb = this.db
        .selectFrom('user_object_follows as uof')
        .innerJoin('accounts_current as ac', (join) =>
          join.onRef('uof.account', '=', 'ac.name'),
        )
        .where('uof.object_id', '=', objectId)
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
              ? qb.orderBy(sql`uof.created_at`, 'desc').orderBy(sql`ac.name`, 'asc')
              : qb.orderBy(sql`ac.wobjects_weight desc nulls last`).orderBy(sql`ac.name`, 'asc');

      return await ordered.offset(skip).limit(limit).execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }
}
