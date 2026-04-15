import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { NewUserSubscription, NewUserAccountMute } from '@opden-data-layer/core';

/** Kysely instance or transaction client (same query API). */
export type DbExecutor = Kysely<Database>;

@Injectable()
export class SocialGraphRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  executor(trx?: DbExecutor): DbExecutor {
    return trx ?? this.db;
  }

  async runInTransaction<T>(fn: (trx: DbExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction().execute(fn);
  }

  async subscriptionExists(
    follower: string,
    following: string,
    trx?: DbExecutor,
  ): Promise<boolean> {
    const e = this.executor(trx);
    const row = await e
      .selectFrom('user_subscriptions')
      .select('follower')
      .where('follower', '=', follower)
      .where('following', '=', following)
      .executeTakeFirst();
    return row !== undefined;
  }

  async insertSubscription(
    row: NewUserSubscription,
    trx?: DbExecutor,
  ): Promise<void> {
    const e = this.executor(trx);
    await e
      .insertInto('user_subscriptions')
      .values(row)
      .onConflict((oc) => oc.columns(['follower', 'following']).doNothing())
      .execute();
  }

  async deleteSubscription(
    follower: string,
    following: string,
    trx?: DbExecutor,
  ): Promise<void> {
    const e = this.executor(trx);
    await e
      .deleteFrom('user_subscriptions')
      .where('follower', '=', follower)
      .where('following', '=', following)
      .execute();
  }

  async muteExists(muter: string, muted: string, trx?: DbExecutor): Promise<boolean> {
    const e = this.executor(trx);
    const row = await e
      .selectFrom('user_account_mutes')
      .select('muter')
      .where('muter', '=', muter)
      .where('muted', '=', muted)
      .executeTakeFirst();
    return row !== undefined;
  }

  async insertMute(row: NewUserAccountMute, trx?: DbExecutor): Promise<void> {
    const e = this.executor(trx);
    await e
      .insertInto('user_account_mutes')
      .values(row)
      .onConflict((oc) => oc.columns(['muter', 'muted']).doNothing())
      .execute();
  }

  async deleteMute(muter: string, muted: string, trx?: DbExecutor): Promise<void> {
    const e = this.executor(trx);
    await e
      .deleteFrom('user_account_mutes')
      .where('muter', '=', muter)
      .where('muted', '=', muted)
      .execute();
  }

  /**
   * After a new follow: `following` gains a follower; `follower` gains a following.
   */
  async incrementFollowRelationshipCounts(
    follower: string,
    following: string,
    trx?: DbExecutor,
  ): Promise<void> {
    const e = this.executor(trx);
    await e
      .updateTable('accounts_current')
      .set({ followers_count: sql`followers_count + 1` })
      .where('name', '=', following)
      .execute();
    await e
      .updateTable('accounts_current')
      .set({ users_following_count: sql`users_following_count + 1` })
      .where('name', '=', follower)
      .execute();
  }

  /**
   * Inverse of incrementFollowRelationshipCounts (unfollow / remove).
   */
  async decrementFollowRelationshipCounts(
    follower: string,
    following: string,
    trx?: DbExecutor,
  ): Promise<void> {
    const e = this.executor(trx);
    await e
      .updateTable('accounts_current')
      .set({
        followers_count: sql`GREATEST(followers_count - 1, 0)`,
      })
      .where('name', '=', following)
      .execute();
    await e
      .updateTable('accounts_current')
      .set({
        users_following_count: sql`GREATEST(users_following_count - 1, 0)`,
      })
      .where('name', '=', follower)
      .execute();
  }
}
