import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { NewThread, Thread } from '@opden-data-layer/core';

@Injectable()
export class ThreadsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByKey(author: string, permlink: string): Promise<Thread | undefined> {
    return this.db
      .selectFrom('threads')
      .selectAll()
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .executeTakeFirst();
  }

  async upsertThread(row: NewThread): Promise<void> {
    const { author: _a, permlink: _p, ...rest } = row;
    void _a;
    void _p;
    await this.db
      .insertInto('threads')
      .values(row)
      .onConflict((oc) =>
        oc.columns(['author', 'permlink']).doUpdateSet({
          ...rest,
        }),
      )
      .execute();
  }

  /**
   * Appends reply ref and increments children only if parent row exists.
   * @returns true if a row was updated.
   */
  async addReply(
    parentAuthor: string,
    parentPermlink: string,
    replyRef: string,
  ): Promise<boolean> {
    const result = await this.db
      .updateTable('threads')
      .set({
        replies: sql`array_append(replies, ${replyRef})`,
        children: sql`children + 1`,
        updated_at_unix: sql`EXTRACT(EPOCH FROM NOW())::bigint`,
      })
      .where('author', '=', parentAuthor)
      .where('permlink', '=', parentPermlink)
      .executeTakeFirst();

    const n = result.numUpdatedRows ?? BigInt(0);
    return Number(n) > 0;
  }

  async softDelete(author: string, permlink: string): Promise<void> {
    await this.db
      .updateTable('threads')
      .set({
        deleted: true,
        updated_at_unix: sql`EXTRACT(EPOCH FROM NOW())::bigint`,
      })
      .where('author', '=', author)
      .where('permlink', '=', permlink)
      .execute();
  }
}
