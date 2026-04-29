import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';

@Injectable()
export class UserShopDeselectRepository {
  private readonly logger = new Logger(UserShopDeselectRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findObjectIdsByAccount(account: string): Promise<string[]> {
    const trimmed = account.trim();
    if (trimmed.length === 0) {
      return [];
    }
    try {
      const rows = await this.db
        .selectFrom('user_shop_deselect')
        .select('object_id')
        .where('account', '=', trimmed)
        .execute();
      return rows.map((r) => r.object_id);
    } catch (error) {
      this.logger.error(
        `findObjectIdsByAccount failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
