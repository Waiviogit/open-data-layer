import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';

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
}
