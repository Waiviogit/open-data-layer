/**
 * Waivio stores a reblog as a stub post: empty title/body, `reblog_to` = source,
 * `author` = reblogger, `createdAt` = reblog time. ODL maps that to
 * `post_reblogged_users`, never to `posts`.
 */
import type { NewPostRebloggedUser } from '@opden-data-layer/odl-db-types';

import type { MongoDate, MongoPost } from './types';

export function mongoReblogPostKey(author: string, permlink: string): string {
  return `${author}\0${permlink}`;
}

export function isMongoReblogStub(doc: MongoPost): boolean {
  const sourceAuthor = doc.reblog_to?.author?.trim() ?? '';
  const sourcePermlink = doc.reblog_to?.permlink?.trim() ?? '';
  if (sourceAuthor === '' || sourcePermlink === '') {
    return false;
  }
  const titleTrim = doc.title?.trim() ?? '';
  const bodyTrim = doc.body?.trim() ?? '';
  return titleTrim === '' && bodyTrim === '';
}

function parseMongoDateUnix(u: unknown): number | null {
  if (u instanceof Date) {
    const ms = u.getTime();
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
  }
  if (typeof u === 'string') {
    const t = Date.parse(u);
    return Number.isNaN(t) ? null : Math.floor(t / 1000);
  }
  if (u && typeof u === 'object' && '$date' in (u as object)) {
    const d = (u as MongoDate).$date;
    if (typeof d === 'number' && Number.isFinite(d)) {
      return Math.floor(d / 1000);
    }
    const t = Date.parse(String(d));
    return Number.isNaN(t) ? null : Math.floor(t / 1000);
  }
  return null;
}

function mongoOidHex(id: MongoPost['_id']): string | null {
  if (id == null) {
    return null;
  }
  if (typeof id === 'string') {
    return id;
  }
  if (typeof id === 'object' && '$oid' in id && typeof id.$oid === 'string') {
    return id.$oid;
  }
  return null;
}

function unixFromStubCreatedAt(doc: MongoPost): number {
  const fromCreatedAt = parseMongoDateUnix(doc.createdAt);
  if (fromCreatedAt !== null) {
    return fromCreatedAt;
  }
  const oid = mongoOidHex(doc._id);
  if (oid && oid.length >= 8) {
    const parsed = Number.parseInt(oid.slice(0, 8), 16);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** Stub → `post_reblogged_users` row, or null if not a stub / guest / self-reblog / no time. */
export function reblogFromMongoStub(doc: MongoPost): NewPostRebloggedUser | null {
  if (!isMongoReblogStub(doc)) {
    return null;
  }
  const account = doc.author?.trim() ?? '';
  const author = doc.reblog_to?.author?.trim() ?? '';
  const permlink = doc.reblog_to?.permlink?.trim() ?? '';
  if (account === '' || author === '' || permlink === '') {
    return null;
  }
  if (account.includes('_') || author.includes('_')) {
    return null;
  }
  if (account.toLowerCase() === author.toLowerCase()) {
    return null;
  }
  const rebloggedAtUnix = unixFromStubCreatedAt(doc);
  if (rebloggedAtUnix <= 0) {
    return null;
  }
  return {
    author,
    permlink,
    account,
    reblogged_at_unix: rebloggedAtUnix,
  };
}

export function partitionStubsByExistingPosts(
  stubs: readonly NewPostRebloggedUser[],
  existingKeys: ReadonlySet<string>,
): { ready: NewPostRebloggedUser[]; pending: NewPostRebloggedUser[] } {
  const ready: NewPostRebloggedUser[] = [];
  const pending: NewPostRebloggedUser[] = [];
  for (const row of stubs) {
    if (existingKeys.has(mongoReblogPostKey(row.author, row.permlink))) {
      ready.push(row);
    } else {
      pending.push(row);
    }
  }
  return { ready, pending };
}

/** One VALUES row per PK; last occurrence wins (Postgres rejects duplicate conflict targets). */
export function dedupeReblogsLastWins(
  rows: readonly NewPostRebloggedUser[],
): NewPostRebloggedUser[] {
  const map = new Map<string, NewPostRebloggedUser>();
  for (const row of rows) {
    map.set(`${row.author}\0${row.permlink}\0${row.account}`, row);
  }
  return [...map.values()];
}
