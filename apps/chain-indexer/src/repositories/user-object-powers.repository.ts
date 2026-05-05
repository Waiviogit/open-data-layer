import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { UserObjectPower } from '@opden-data-layer/core';

@Injectable()
export class UserObjectPowersRepository {
  private readonly logger = new Logger(UserObjectPowersRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByAccount(account: string): Promise<UserObjectPower | null> {
    try {
      return await this.db
        .selectFrom('user_object_powers')
        .where('account', '=', account)
        .selectAll()
        .executeTakeFirst();
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  async create(account: string, waiv_power: number): Promise<void> {
    await this.db
      .insertInto('user_object_powers')
      .values({ account, waiv_power })
      .execute();
  }

  async incrementWaivPower(account: string, delta: number): Promise<void> {
    await sql`
      UPDATE user_object_powers
      SET waiv_power = GREATEST(0::double precision, waiv_power + ${delta}::double precision)
      WHERE account = ${account}
    `.execute(this.db);
  }

  async findWaivPowersByAccounts(accounts: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (accounts.length === 0) return map;
    try {
      const rows = await this.db
        .selectFrom('user_object_powers')
        .where('account', 'in', accounts)
        .select(['account', 'waiv_power'])
        .execute();
      for (const r of rows) {
        map.set(r.account, r.waiv_power);
      }
    } catch (e) {
      this.logger.error((e as Error).message);
    }
    return map;
  }
}
