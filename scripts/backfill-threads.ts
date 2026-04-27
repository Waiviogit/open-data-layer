/**
 * Backfill `threads` and `thread_active_votes` from Hive (Leo/Ecency thread replies).
 * Uses dhive Client: blog via getDiscussions('blog'), replies via condenser get_content_replies.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env scripts/backfill-threads.ts [--author leothreads] [--page-size 20] [--dry-run]
 */
import { Client } from '@hiveio/dhive';
import type { NewThread, NewThreadActiveVote, OdlDatabase } from '@opden-data-layer/core';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

import { HIVE_RPC_NODES } from '../libs/clients/src/hive-client/constants';
import {
  DEFAULT_PERCENT_HBD,
  getThreadType,
  SEED_TICKERS,
  THREAD_ACCOUNTS,
  THREAD_TYPE_ECENCY,
  THREADS_ACC,
} from '../apps/chain-indexer/src/constants/thread-accounts';
import {
  blockTimestampToUnixSeconds,
  cashoutTimeFromBlock,
} from '../apps/chain-indexer/src/domain/hive-comment/hive-datetime.util';
import {
  detectBulkMessage,
  extractCryptoTickers,
  extractHashtags,
  extractHashtagsFromMetadata,
  extractImages,
  extractLinks,
  extractMentions,
} from '../apps/chain-indexer/src/domain/hive-comment/thread-extractors';

interface CliOptions {
  author: string;
  pageSize: number;
  maxPosts: number | undefined;
  maxReplies: number | undefined;
  dryRun: boolean;
  hiveNodes: string[];
}

function parseArgs(argv: string[]): CliOptions {
  let author = THREADS_ACC;
  let pageSize = 20;
  let maxPosts: number | undefined;
  let maxReplies: number | undefined;
  let dryRun = false;
  let hiveUrl: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--author' && argv[i + 1]) {
      author = argv[++i] ?? author;
      continue;
    }
    if (a === '--page-size' && argv[i + 1]) {
      const n = Number.parseInt(argv[++i] ?? '', 10);
      pageSize = Number.isFinite(n) && n > 0 ? n : pageSize;
      continue;
    }
    if (a === '--max-posts' && argv[i + 1]) {
      const n = Number.parseInt(argv[++i] ?? '', 10);
      maxPosts = Number.isFinite(n) && n > 0 ? n : undefined;
      continue;
    }
    if (a === '--max-replies' && argv[i + 1]) {
      const n = Number.parseInt(argv[++i] ?? '', 10);
      maxReplies = Number.isFinite(n) && n > 0 ? n : undefined;
      continue;
    }
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (a === '--hive-url' && argv[i + 1]) {
      hiveUrl = argv[++i];
      continue;
    }
  }

  const hiveNodes = resolveHiveNodes(hiveUrl);
  return { author, pageSize, maxPosts, maxReplies, dryRun, hiveNodes };
}

function resolveHiveNodes(hiveUrl: string | undefined): string[] {
  const raw = process.env['HIVE_RPC_URL']?.trim();
  if (hiveUrl?.trim()) {
    return hiveUrl
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [...HIVE_RPC_NODES];
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function metadataToString(raw: unknown): string {
  if (raw == null) {
    return '';
  }
  if (typeof raw === 'string') {
    return raw;
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return '';
  }
}

function toFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return undefined;
}

function toBigIntOrNull(v: unknown): bigint | null {
  if (typeof v === 'bigint') {
    return v;
  }
  const n = toFiniteNumber(v);
  if (n !== undefined) {
    return BigInt(Math.trunc(n));
  }
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) {
    return BigInt(v.trim());
  }
  return null;
}

function pickString(record: Record<string, unknown>, key: string): string {
  const v = record[key];
  return typeof v === 'string' ? v : v != null ? String(v) : '';
}

function isDiscussionRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function discussionParentRef(post: Record<string, unknown>): { author: string; permlink: string } {
  const author = pickString(post, 'author');
  const permlink = pickString(post, 'permlink');
  return { author, permlink };
}

function mapHiveCommentToThread(
  comment: Record<string, unknown>,
): { row: NewThread; votes: NewThreadActiveVote[] } {
  const author = pickString(comment, 'author');
  const permlink = pickString(comment, 'permlink');
  const parentAuthor = pickString(comment, 'parent_author');
  const parentPermlink = pickString(comment, 'parent_permlink');
  const body = pickString(comment, 'body');
  const createdRaw = pickString(comment, 'created');
  const metadataStr = metadataToString(comment['json_metadata']);

  const threadType = getThreadType(parentAuthor);
  const hashtags =
    threadType === THREAD_TYPE_ECENCY
      ? extractHashtagsFromMetadata(metadataStr)
      : extractHashtags(body);

  const tickers = extractCryptoTickers(metadataStr, [...SEED_TICKERS]);
  const createdUnix = blockTimestampToUnixSeconds(createdRaw || new Date().toISOString());

  const cashoutRaw = pickString(comment, 'cashout_time');
  const cashoutTime =
    cashoutRaw.length > 0 ? cashoutRaw.slice(0, 19) : cashoutTimeFromBlock(createdRaw);

  const depth = toFiniteNumber(comment['depth']) ?? 0;
  const children = toFiniteNumber(comment['children']) ?? 0;

  const repliesRaw = comment['replies'];
  const replies =
    Array.isArray(repliesRaw) && repliesRaw.every((x) => typeof x === 'string')
      ? (repliesRaw as string[])
      : [];

  const percentFromApi = toFiniteNumber(comment['percent_hbd']);
  const percentHbd =
    percentFromApi !== undefined ? percentFromApi : DEFAULT_PERCENT_HBD;

  const row: NewThread = {
    author,
    permlink,
    parent_author: parentAuthor,
    parent_permlink: parentPermlink,
    body,
    created: createdRaw || null,
    replies,
    children,
    depth,
    author_reputation: toBigIntOrNull(comment['author_reputation']),
    deleted: false,
    tickers,
    mentions: extractMentions(body),
    hashtags,
    links: extractLinks(body),
    images: extractImages(metadataStr),
    threadstorm: false,
    net_rshares: toBigIntOrNull(comment['net_rshares']),
    pending_payout_value: pickString(comment, 'pending_payout_value') || null,
    total_payout_value: pickString(comment, 'total_payout_value') || null,
    percent_hbd: percentHbd,
    cashout_time: cashoutTime || null,
    bulk_message: detectBulkMessage(metadataStr),
    type: threadType,
    created_unix: createdUnix,
    updated_at_unix: createdUnix,
  };

  const votes: NewThreadActiveVote[] = [];
  const activeVotes = comment['active_votes'];
  if (Array.isArray(activeVotes)) {
    for (const v of activeVotes) {
      if (!isDiscussionRecord(v)) {
        continue;
      }
      const voter = pickString(v, 'voter');
      if (!voter) {
        continue;
      }
      votes.push({
        author,
        permlink,
        voter,
        weight: toFiniteNumber(v['weight']) ?? null,
        percent: toFiniteNumber(v['percent']) ?? null,
        rshares: toBigIntOrNull(v['rshares']),
        rshares_waiv: null,
      });
    }
  }

  return { row, votes };
}

async function upsertThreadWithVotes(
  db: Kysely<OdlDatabase>,
  row: NewThread,
  votes: NewThreadActiveVote[],
): Promise<void> {
  const { author: _a, permlink: _p, ...rest } = row;
  void _a;
  void _p;

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('threads')
      .values(row)
      .onConflict((oc) =>
        oc.columns(['author', 'permlink']).doUpdateSet({
          ...rest,
        }),
      )
      .execute();

    await trx
      .deleteFrom('thread_active_votes')
      .where('author', '=', row.author)
      .where('permlink', '=', row.permlink)
      .execute();

    if (votes.length > 0) {
      await trx.insertInto('thread_active_votes').values(votes).execute();
    }
  });
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (!(THREAD_ACCOUNTS as readonly string[]).includes(opts.author)) {
    fail(
      `Invalid author: ${opts.author}. Must be one of: ${THREAD_ACCOUNTS.join(', ')}`,
    );
  }

  if (!opts.dryRun) {
    const dbUrl = process.env['DATABASE_URL']?.trim();
    if (!dbUrl) {
      fail('DATABASE_URL is required unless --dry-run.');
    }
  }

  const client = new Client(opts.hiveNodes);

  let startAuthor: string | undefined;
  let startPermlink: string | undefined;
  let postsProcessed = 0;
  let repliesWritten = 0;

  const pool = opts.dryRun
    ? null
    : new pg.Pool({ connectionString: process.env['DATABASE_URL'] });

  const db = pool
    ? new Kysely<OdlDatabase>({
        dialect: new PostgresDialect({ pool }),
      })
    : null;

  try {
    outer: while (true) {
      if (opts.maxPosts !== undefined && postsProcessed >= opts.maxPosts) {
        break;
      }

      const query: Record<string, string | number> = {
        tag: opts.author,
        limit: opts.pageSize,
      };
      if (startAuthor) {
        query['start_author'] = startAuthor;
      }
      if (startPermlink) {
        query['start_permlink'] = startPermlink;
      }

      const posts = (await client.database.getDiscussions(
        'blog',
        query,
      )) as unknown;

      if (!Array.isArray(posts) || posts.length === 0) {
        break;
      }

      for (const post of posts) {
        if (opts.maxPosts !== undefined && postsProcessed >= opts.maxPosts) {
          break outer;
        }
        if (!isDiscussionRecord(post)) {
          continue;
        }

        const { author: postAuthor, permlink } = discussionParentRef(post);
        if (!postAuthor || !permlink) {
          continue;
        }

        postsProcessed++;

        let comments: unknown;
        try {
          comments = await client.database.call('get_content_replies', [
            postAuthor,
            permlink,
          ]);
        } catch (e) {
          console.error(
            `get_content_replies failed for ${postAuthor}/${permlink}:`,
            e instanceof Error ? e.message : e,
          );
          startAuthor = postAuthor;
          startPermlink = permlink;
          continue;
        }

        if (!Array.isArray(comments)) {
          startAuthor = postAuthor;
          startPermlink = permlink;
          continue;
        }

        for (const c of comments) {
          if (opts.maxReplies !== undefined && repliesWritten >= opts.maxReplies) {
            break outer;
          }
          if (!isDiscussionRecord(c)) {
            continue;
          }
          const depth = toFiniteNumber(c['depth']) ?? 0;
          if (depth !== 1) {
            continue;
          }

          const { row, votes } = mapHiveCommentToThread(c);

          if (opts.dryRun) {
            console.log(
              `[dry-run] thread ${row.author}/${row.permlink} votes=${votes.length}`,
            );
          } else if (db) {
            await upsertThreadWithVotes(db, row, votes);
          }
          repliesWritten++;
        }

        startAuthor = postAuthor;
        startPermlink = permlink;
        console.log(
          `posts=${postsProcessed} threads_upserted=${repliesWritten} last_parent=${postAuthor}/${permlink}`,
        );
      }
    }

    console.log(
      `Done. parent_posts_seen=${postsProcessed} depth1_threads=${repliesWritten} dry_run=${opts.dryRun}`,
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
