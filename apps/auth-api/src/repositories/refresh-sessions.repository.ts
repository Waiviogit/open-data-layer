import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { KYSELY_AUTH } from '../database';
import type { AuthDatabase, NewRefreshSession } from '../database/types';

@Injectable()
export class RefreshSessionsRepository {
  private readonly logger = new Logger(RefreshSessionsRepository.name);

  constructor(@Inject(KYSELY_AUTH) private readonly db: Kysely<AuthDatabase>) {}

  async insert(row: NewRefreshSession): Promise<void> {
    try {
      await this.db.insertInto('refresh_sessions').values(row).execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      throw e;
    }
  }

  async findActiveById(id: string): Promise<import('../database/types').RefreshSession | null> {
    try {
      return (
        (await this.db
          .selectFrom('refresh_sessions')
          .where('id', '=', id)
          .where('revoked_at', 'is', null)
          .selectAll()
          .executeTakeFirst()) ?? null
      );
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  async revoke(id: string, revokedAt: Date): Promise<boolean> {
    try {
      const r = await this.db
        .updateTable('refresh_sessions')
        .set({ revoked_at: revokedAt })
        .where('id', '=', id)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();
      return Number(r.numUpdatedRows) > 0;
    } catch (e) {
      this.logger.error((e as Error).message);
      return false;
    }
  }
}
