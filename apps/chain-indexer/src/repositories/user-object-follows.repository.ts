import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { NewUserObjectFollow, UserObjectFollow } from '@opden-data-layer/core';
import type { Database } from '../database';
import { KYSELY } from '../database';

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

  async upsert(row: NewUserObjectFollow): Promise<void> {
    await this.db
      .insertInto('user_object_follows')
      .values(row)
      .onConflict((oc) =>
        oc.columns(['account', 'object_id']).doUpdateSet({
          created_at: row.created_at,
          bell: row.bell,
        }),
      )
      .execute();
  }

  async delete(account: string, objectId: string): Promise<void> {
    await this.db
      .deleteFrom('user_object_follows')
      .where('account', '=', account)
      .where('object_id', '=', objectId)
      .execute();
  }

  async updateBell(account: string, objectId: string, bell: boolean): Promise<void> {
    await this.db
      .updateTable('user_object_follows')
      .set({ bell })
      .where('account', '=', account)
      .where('object_id', '=', objectId)
      .execute();
  }
}
