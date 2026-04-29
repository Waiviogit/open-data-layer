import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';

@Injectable()
export class UserShopDeselectRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findObjectIdsByAccount(account: string): Promise<string[]> {
    const trimmed = account.trim();
    if (trimmed.length === 0) {
      return [];
    }
    const rows = await this.db
      .selectFrom('user_shop_deselect')
      .select('object_id')
      .where('account', '=', trimmed)
      .execute();
    return rows.map((r) => r.object_id);
  }

  async add(account: string, objectId: string): Promise<void> {
    const a = account.trim();
    const o = objectId.trim();
    if (a.length === 0 || o.length === 0) {
      return;
    }
    await this.db
      .insertInto('user_shop_deselect')
      .values({ account: a, object_id: o })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  async remove(account: string, objectId: string): Promise<void> {
    const a = account.trim();
    const o = objectId.trim();
    if (a.length === 0 || o.length === 0) {
      return;
    }
    await this.db
      .deleteFrom('user_shop_deselect')
      .where('account', '=', a)
      .where('object_id', '=', o)
      .execute();
  }
}
