import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { NewPostReblogPending, PostReblogPending } from '@opden-data-layer/odl-db-types';
import type { Database } from '../database';
import { KYSELY } from '../database';

@Injectable()
export class PostReblogPendingRepository {
  private readonly logger = new Logger(PostReblogPendingRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /** Idempotent pending reblog; earlier block time wins. */
  async upsert(row: NewPostReblogPending): Promise<void> {
    try {
      await this.db
        .insertInto('post_reblog_pending')
        .values(row)
        .onConflict((oc) =>
          oc.columns(['author', 'permlink', 'account']).doUpdateSet({
            reblogged_at_unix: sql`LEAST(post_reblog_pending.reblogged_at_unix, excluded.reblogged_at_unix)`,
          }),
        )
        .execute();
    } catch (error) {
      this.logger.error((error as Error).message);
      throw error;
    }
  }

  async findByPost(author: string, permlink: string): Promise<PostReblogPending[]> {
    try {
      return await this.db
        .selectFrom('post_reblog_pending')
        .selectAll()
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();
    } catch (error) {
      this.logger.error((error as Error).message);
      return [];
    }
  }

  async deleteByPost(author: string, permlink: string): Promise<void> {
    try {
      await this.db
        .deleteFrom('post_reblog_pending')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .execute();
    } catch (error) {
      this.logger.error((error as Error).message);
      throw error;
    }
  }

  async deleteOne(author: string, permlink: string, account: string): Promise<void> {
    try {
      await this.db
        .deleteFrom('post_reblog_pending')
        .where('author', '=', author)
        .where('permlink', '=', permlink)
        .where('account', '=', account)
        .execute();
    } catch (error) {
      this.logger.error((error as Error).message);
      throw error;
    }
  }
}
