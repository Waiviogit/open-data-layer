import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { KYSELY_AUTH } from '../database';
import type { AuthChallenge, AuthDatabase, NewAuthChallenge } from '../database/types';

@Injectable()
export class ChallengesRepository {
  private readonly logger = new Logger(ChallengesRepository.name);

  constructor(@Inject(KYSELY_AUTH) private readonly db: Kysely<AuthDatabase>) {}

  async insert(row: NewAuthChallenge): Promise<void> {
    try {
      await this.db.insertInto('auth_challenges').values(row).execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      throw e;
    }
  }

  async findById(id: string): Promise<AuthChallenge | null> {
    try {
      return (
        (await this.db
          .selectFrom('auth_challenges')
          .where('id', '=', id)
          .selectAll()
          .executeTakeFirst()) ?? null
      );
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  async findActiveHivesignerByState(state: string): Promise<AuthChallenge | null> {
    try {
      return (
        (await this.db
          .selectFrom('auth_challenges')
          .where('provider', '=', 'hivesigner')
          .where(sql`metadata_json->>'state'`, '=', state)
          .where('used_at', 'is', null)
          .selectAll()
          .executeTakeFirst()) ?? null
      );
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  async markUsed(id: string, usedAt: Date): Promise<boolean> {
    try {
      const r = await this.db
        .updateTable('auth_challenges')
        .set({ used_at: usedAt })
        .where('id', '=', id)
        .where('used_at', 'is', null)
        .executeTakeFirst();
      return Number(r.numUpdatedRows) > 0;
    } catch (e) {
      this.logger.error((e as Error).message);
      return false;
    }
  }
}
