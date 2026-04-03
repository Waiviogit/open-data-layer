import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { Post, PostObject } from '@opden-data-layer/core';

export interface FeedBranchRow {
  author: string;
  permlink: string;
  feed_at: number;
  reblogged_by: string | null;
}

export interface PostVoteSummary {
  totalCount: number;
  previewVoters: string[];
}

const PREVIEW_VOTER_LIMIT = 3;

@Injectable()
export class PostsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Own root posts + reblogs for account, merged newest-first with dedup by (author, permlink).
   */
  async findUserBlogFeed(
    account: string,
    cursor: { feedAt: number; author: string; permlink: string } | null,
    limitPlusOne: number,
  ): Promise<FeedBranchRow[]> {
    const own = await this.loadOwnPostsBranch(account, cursor, limitPlusOne);
    const reblogs = await this.loadReblogsBranch(account, cursor, limitPlusOne);
    return mergeFeedBranches(own, reblogs, limitPlusOne);
  }

  private async loadOwnPostsBranch(
    account: string,
    cursor: { feedAt: number; author: string; permlink: string } | null,
    limitPlusOne: number,
  ): Promise<FeedBranchRow[]> {
    let qb = this.db
      .selectFrom('posts')
      .where('author', '=', account)
      .where((eb) => eb.or([eb('depth', '=', 0), eb('depth', 'is', null)]))
      .select([
        'author',
        'permlink',
        sql<number>`posts.created_unix`.as('feed_at'),
        sql<string | null>`NULL::text`.as('reblogged_by'),
      ]);

    if (cursor) {
      qb = qb.where(
        sql`(posts.created_unix, posts.author, posts.permlink) < (${cursor.feedAt}, ${cursor.author}, ${cursor.permlink})` as never,
      );
    }

    const rows = await qb
      .orderBy(sql`posts.created_unix`, 'desc')
      .orderBy('posts.author', 'desc')
      .orderBy('posts.permlink', 'desc')
      .limit(limitPlusOne)
      .execute();

    return rows.map((r) => ({
      author: r.author,
      permlink: r.permlink,
      feed_at: r.feed_at,
      reblogged_by: r.reblogged_by,
    }));
  }

  private async loadReblogsBranch(
    account: string,
    cursor: { feedAt: number; author: string; permlink: string } | null,
    limitPlusOne: number,
  ): Promise<FeedBranchRow[]> {
    let qb = this.db
      .selectFrom('post_reblogged_users as r')
      .innerJoin('posts as p', (join) =>
        join.onRef('r.author', '=', 'p.author').onRef('r.permlink', '=', 'p.permlink'),
      )
      .where('r.account', '=', account)
      .select([
        sql<string>`p.author`.as('author'),
        sql<string>`p.permlink`.as('permlink'),
        sql<number>`r.reblogged_at_unix`.as('feed_at'),
        sql<string>`r.account`.as('reblogged_by'),
      ]);

    if (cursor) {
      qb = qb.where(
        sql`(r.reblogged_at_unix, p.author, p.permlink) < (${cursor.feedAt}, ${cursor.author}, ${cursor.permlink})` as never,
      );
    }

    const rows = await qb
      .orderBy(sql`r.reblogged_at_unix`, 'desc')
      .orderBy(sql`p.author`, 'desc')
      .orderBy(sql`p.permlink`, 'desc')
      .limit(limitPlusOne)
      .execute();

    return rows.map((r) => ({
      author: r.author,
      permlink: r.permlink,
      feed_at: r.feed_at,
      reblogged_by: r.reblogged_by,
    }));
  }

  async findPostsByKeys(keys: { author: string; permlink: string }[]): Promise<Post[]> {
    if (keys.length === 0) {
      return [];
    }
    return this.db
      .selectFrom('posts')
      .where((eb) =>
        eb.or(
          keys.map((k) =>
            eb.and([eb('author', '=', k.author), eb('permlink', '=', k.permlink)]),
          ),
        ),
      )
      .selectAll()
      .execute();
  }

  async findPostObjectsByKeys(keys: { author: string; permlink: string }[]): Promise<PostObject[]> {
    if (keys.length === 0) {
      return [];
    }
    return this.db
      .selectFrom('post_objects')
      .where((eb) =>
        eb.or(
          keys.map((k) =>
            eb.and([eb('author', '=', k.author), eb('permlink', '=', k.permlink)]),
          ),
        ),
      )
      .selectAll()
      .execute();
  }

  async findActiveVoteSummaries(
    keys: { author: string; permlink: string }[],
  ): Promise<Map<string, PostVoteSummary>> {
    const result = new Map<string, PostVoteSummary>();
    if (keys.length === 0) {
      return result;
    }

    const pairKey = (a: string, p: string) => `${a}\0${p}`;

    for (const k of keys) {
      result.set(pairKey(k.author, k.permlink), { totalCount: 0, previewVoters: [] });
    }

    const counts = await this.db
      .selectFrom('post_active_votes')
      .where((eb) =>
        eb.or(
          keys.map((k) =>
            eb.and([eb('author', '=', k.author), eb('permlink', '=', k.permlink)]),
          ),
        ),
      )
      .groupBy(['author', 'permlink'])
      .select((eb) => ['author', 'permlink', eb.fn.countAll<number>().as('cnt')])
      .execute();

    for (const row of counts) {
      const pk = pairKey(row.author, row.permlink);
      const existing = result.get(pk);
      if (existing) {
        existing.totalCount = Number(row.cnt);
      }
    }

    const whereSql = sql.join(
      keys.map((k) => sql`(author = ${k.author} AND permlink = ${k.permlink})`),
      sql` OR `,
    );

    const preview = await sql<{ author: string; permlink: string; voter: string }>`
      SELECT author, permlink, voter
      FROM (
        SELECT author, permlink, voter,
          ROW_NUMBER() OVER (
            PARTITION BY author, permlink
            ORDER BY COALESCE(rshares, 0) DESC NULLS LAST, voter ASC
          ) AS rn
        FROM post_active_votes
        WHERE ${whereSql}
      ) t
      WHERE rn <= ${PREVIEW_VOTER_LIMIT}
    `.execute(this.db);

    const previewRows = preview.rows as { author: string; permlink: string; voter: string }[];
    for (const row of previewRows) {
      const pk = pairKey(row.author, row.permlink);
      const existing = result.get(pk);
      if (existing) {
        existing.previewVoters.push(row.voter);
      }
    }

    return result;
  }
}

function mergeFeedBranches(
  own: FeedBranchRow[],
  reblogs: FeedBranchRow[],
  limitPlusOne: number,
): FeedBranchRow[] {
  const combined = [...own, ...reblogs];
  combined.sort((a, b) => {
    if (b.feed_at !== a.feed_at) {
      return b.feed_at - a.feed_at;
    }
    if (b.author !== a.author) {
      return b.author.localeCompare(a.author);
    }
    return b.permlink.localeCompare(a.permlink);
  });

  const seen = new Set<string>();
  const out: FeedBranchRow[] = [];
  for (const row of combined) {
    const k = `${row.author}\0${row.permlink}`;
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(row);
    if (out.length >= limitPlusOne) {
      break;
    }
  }
  return out;
}
