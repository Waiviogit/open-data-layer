import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';

@Injectable()
export class UserAccountMutesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Accounts muted (Hive ignore) by any of the given muters.
   */
  async listMutedForMuters(muters: string[]): Promise<string[]> {
    if (muters.length === 0) {
      return [];
    }
    const uniqueMuters = [...new Set(muters)];
    const rows = await this.db
      .selectFrom('user_account_mutes')
      .select('muted')
      .where('muter', 'in', uniqueMuters)
      .execute();
    return [...new Set(rows.map((r) => r.muted))];
  }
}
