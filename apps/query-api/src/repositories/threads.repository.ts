import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Thread } from '@opden-data-layer/core';
import type { Database } from '../database';
import { KYSELY } from '../database';

export interface ThreadVoteSummary {
  totalCount: number;
  previewVoters: string[];
  voted: boolean;
}

const PREVIEW_VOTER_LIMIT = 3;

@Injectable()
export class ThreadsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Profile threads (`byUser`): mentions profile or author's own non-bulk threads.
   */
  async findUserThreadsFeed(
    profileName: string,
    mutedAuthors: string[],
    cursor: { feedAt: number; author: string; permlink: string } | null,
    sort: 'latest' | 'oldest',
    limitPlusOne: number,
  ): Promise<Thread[]> {
    let qb = this.db
      .selectFrom('threads')
      .selectAll()
      .where('deleted', '=', false)
      .where((eb) =>
        eb.or([
          eb.and([
            sql<boolean>`LOWER(threads.author) = LOWER(${profileName})`,
            eb('bulk_message', '=', false),
          ]),
          sql<boolean>`EXISTS (SELECT 1 FROM unnest(threads.mentions) AS m WHERE LOWER(m) = LOWER(${profileName}))`,
        ]),
      );

    if (mutedAuthors.length > 0) {
      qb = qb.where('author', 'not in', mutedAuthors);
    }

    if (cursor) {
      if (sort === 'latest') {
        qb = qb.where(
          sql`(threads.created_unix, threads.author, threads.permlink) < (${cursor.feedAt}, ${cursor.author}, ${cursor.permlink})` as never,
        );
      } else {
        qb = qb.where(
          sql`(threads.created_unix, threads.author, threads.permlink) > (${cursor.feedAt}, ${cursor.author}, ${cursor.permlink})` as never,
        );
      }
    }

    if (sort === 'latest') {
      qb = qb
        .orderBy('threads.created_unix', 'desc')
        .orderBy('threads.author', 'desc')
        .orderBy('threads.permlink', 'desc');
    } else {
      qb = qb
        .orderBy('threads.created_unix', 'asc')
        .orderBy('threads.author', 'asc')
        .orderBy('threads.permlink', 'asc');
    }

    return qb.limit(limitPlusOne).execute();
  }

  /**
   * Vote counts and preview voters from `thread_active_votes` (same shape as post feed).
   */
  async findThreadActiveVoteSummaries(
    keys: { author: string; permlink: string }[],
    viewerAccount?: string,
  ): Promise<Map<string, ThreadVoteSummary>> {
    const result = new Map<string, ThreadVoteSummary>();
    if (keys.length === 0) {
      return result;
    }

    const pairKey = (a: string, p: string) => `${a}\0${p}`;

    for (const k of keys) {
      result.set(pairKey(k.author, k.permlink), {
        totalCount: 0,
        previewVoters: [],
        voted: false,
      });
    }

    const whereSql = sql.join(
      keys.map((k) => sql`(author = ${k.author} AND permlink = ${k.permlink})`),
      sql` OR `,
    );

    const viewerTrimmed = viewerAccount?.trim() ?? '';
    const viewerVotedExpr =
      viewerTrimmed.length > 0
        ? sql`BOOL_OR(LOWER(TRIM(voter)) = LOWER(${viewerTrimmed})) OVER (PARTITION BY author, permlink)`
        : sql`false`;

    const rows = await sql<{
      author: string;
      permlink: string;
      voter: string;
      cnt: string | number;
      viewer_voted: boolean;
    }>`
      SELECT author, permlink, voter, cnt, viewer_voted
      FROM (
        SELECT
          author,
          permlink,
          voter,
          COUNT(*) OVER (PARTITION BY author, permlink) AS cnt,
          ROW_NUMBER() OVER (
            PARTITION BY author, permlink
            ORDER BY COALESCE(rshares, 0) DESC NULLS LAST, voter ASC
          ) AS rn,
          ${viewerVotedExpr} AS viewer_voted
        FROM thread_active_votes
        WHERE ${whereSql}
      ) t
      WHERE rn <= ${PREVIEW_VOTER_LIMIT}
    `.execute(this.db);

    for (const row of rows.rows) {
      const pk = pairKey(row.author, row.permlink);
      const existing = result.get(pk);
      if (existing) {
        existing.totalCount = Number(row.cnt);
        existing.voted = Boolean(row.viewer_voted);
        existing.previewVoters.push(row.voter);
      }
    }

    return result;
  }
}
