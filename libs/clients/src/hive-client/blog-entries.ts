import { HIVE_BLOG_ENTRIES_MAX_LIMIT } from './constants';
import type { HiveBlogEntry } from './type';

/** Skip Hive vs ODL reblog times within one minute (live indexer is ~1 block off). */
export const REBLOG_TIMESTAMP_BACKFILL_DELTA_SEC = 60;

/** Own-post blog rows are never reblogs (`reblogged_on` is Hive's 1970 sentinel). */
export function isHiveBlogReblogEntry(
  account: string,
  entry: Pick<HiveBlogEntry, 'author'>,
): boolean {
  return entry.author.trim().toLowerCase() !== account.trim().toLowerCase();
}

/** Write only when the stored time is meaningfully wrong. */
export function shouldOverwriteRebloggedAtUnix(
  existingUnix: number,
  hiveUnix: number,
  deltaSec = REBLOG_TIMESTAMP_BACKFILL_DELTA_SEC,
): boolean {
  return Math.abs(existingUnix - hiveUnix) > deltaSec;
}

/** Same invariant as SQL `LEAST(existing, excluded)` on reblog upserts. */
export function earlierRebloggedAtUnix(
  existingUnix: number,
  incomingUnix: number,
): number {
  return Math.min(existingUnix, incomingUnix);
}

/** Clamp `condenser_api.get_blog_entries` limit to Hive's `[1, 500]` range. */
export function clampHiveBlogEntriesLimit(limit: number): number {
  const raw = Number(limit);
  if (!Number.isFinite(raw) || raw < 1) {
    return 1;
  }
  return Math.min(HIVE_BLOG_ENTRIES_MAX_LIMIT, Math.floor(raw));
}

/** Clamp start `entry_id` to a non-negative integer (`0` = newest). */
export function clampHiveBlogEntriesStart(start: number): number {
  const raw = Number(start);
  if (!Number.isFinite(raw) || raw < 0) {
    return 0;
  }
  return Math.floor(raw);
}

/**
 * Next `start` for descending `entry_id` pagination.
 * `null` when the page is exhausted (`lastEntryId === 0` or empty).
 */
export function nextHiveBlogEntriesStart(
  lastEntryId: number,
  pageLength: number,
  pageLimit: number,
): number | null {
  if (pageLength === 0 || lastEntryId <= 0 || pageLength < pageLimit) {
    return null;
  }
  return lastEntryId - 1;
}
