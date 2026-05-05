import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';

export type UserSubscriptionSort = 'rank' | 'followers' | 'a-z' | 'recency';

/** Account row joined from a subscription edge (follower or following side). */
export interface SubscriptionJoinedAccountRow {
  name: string;
  profile_image: string | null;
  wobjects_weight: number;
  users_following_count: number;
}

@Injectable()
export class UserSubscriptionsRepository {
  private readonly logger = new Logger(UserSubscriptionsRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async countFollowersOf(following: string): Promise<number> {
    try {
      const row = await this.db
        .selectFrom('user_subscriptions')
        .where('following', '=', following)
        .select(sql<number>`count(*)::int`.as('c'))
        .executeTakeFirst();
      return Number(row?.c ?? 0);
    } catch (e) {
      this.logger.error((e as Error).message);
      return 0;
    }
  }

  async countFollowingBy(follower: string): Promise<number> {
    try {
      const row = await this.db
        .selectFrom('user_subscriptions')
        .where('follower', '=', follower)
        .select(sql<number>`count(*)::int`.as('c'))
        .executeTakeFirst();
      return Number(row?.c ?? 0);
    } catch (e) {
      this.logger.error((e as Error).message);
      return 0;
    }
  }

  /**
   * Users who follow `following` (their account row), with sort and pagination.
   */
  async findFollowersOf(
    following: string,
    sort: UserSubscriptionSort,
    skip: number,
    limit: number,
  ): Promise<SubscriptionJoinedAccountRow[]> {
    try {
      const qb = this.db
        .selectFrom('user_subscriptions as us')
        .innerJoin('accounts_current as ac', (join) =>
          join.onRef('us.follower', '=', 'ac.name'),
        )
        .where('us.following', '=', following)
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
              ? qb.orderBy(sql`us.created_at`, 'desc').orderBy(sql`ac.name`, 'asc')
              : qb.orderBy(sql`ac.wobjects_weight desc nulls last`).orderBy(sql`ac.name`, 'asc');

      return await ordered.offset(skip).limit(limit).execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  /**
   * Accounts that `follower` follows (`following` column), joined to `accounts_current`.
   */
  async findAccountsFollowedBy(
    follower: string,
    sort: UserSubscriptionSort,
    skip: number,
    limit: number,
  ): Promise<SubscriptionJoinedAccountRow[]> {
    try {
      const qb = this.db
        .selectFrom('user_subscriptions as us')
        .innerJoin('accounts_current as ac', (join) =>
          join.onRef('us.following', '=', 'ac.name'),
        )
        .where('us.follower', '=', follower)
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
              ? qb.orderBy(sql`us.created_at`, 'desc').orderBy(sql`ac.name`, 'asc')
              : qb.orderBy(sql`ac.wobjects_weight desc nulls last`).orderBy(sql`ac.name`, 'asc');

      return await ordered.offset(skip).limit(limit).execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  /**
   * For each `following` account in `targets` that `viewer` follows, return that username.
   */
  async listFollowedSubset(viewer: string, targets: string[]): Promise<string[]> {
    const v = viewer.trim();
    if (v.length === 0 || targets.length === 0) {
      return [];
    }
    const uniqueTargets = [...new Set(targets.filter((t) => t.trim().length > 0))];
    if (uniqueTargets.length === 0) {
      return [];
    }
    try {
      const rows = await this.db
        .selectFrom('user_subscriptions')
        .select('following')
        .where('follower', '=', v)
        .where('following', 'in', uniqueTargets)
        .execute();
      return rows.map((r) => r.following);
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }
}
