import type { LocaleId } from '@/i18n/types';
export { formatRelativeFeedTime } from '@/shared/utils/format-relative-time';

/** Match query-api `FEED_TAGGED_OBJECT_DISPLAY_LIMIT` (feed.constants.ts). */
export const FEED_STORY_TAGGED_OBJECT_MAX = 4;

export function formatVoteSummary(totalCount: number, previewVoters: string[]): string | null {
  if (totalCount <= 0) {
    return null;
  }
  const a = previewVoters[0];
  const b = previewVoters[1];
  if (totalCount === 1) {
    return a ? `@${a} liked this` : `${totalCount} like`;
  }
  if (totalCount === 2) {
    if (a && b) {
      return `@${a} and @${b} liked this`;
    }
    return `${totalCount} like this`;
  }
  if (a && b) {
    return `@${a}, @${b} and ${totalCount - 2} more liked this`;
  }
  return `${totalCount} like this`;
}

export function formatReputation(n: number | undefined, locale: LocaleId): string | null {
  if (n == null || Number.isNaN(n)) {
    return null;
  }
  return n.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parsePayoutNumber(s: string | undefined): number {
  if (s == null || s.trim() === '') {
    return 0;
  }
  const m = s.match(/-?[\d.]+/);
  if (!m) {
    return 0;
  }
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Shows the larger of pending vs total payout (Hive-style strings).
 */
export function formatPayoutDisplay(
  pendingPayout: string | undefined,
  totalPayout: string | undefined,
): string | null {
  const p = parsePayoutNumber(pendingPayout);
  const t = parsePayoutNumber(totalPayout);
  const v = Math.max(p, t);
  if (v <= 0) {
    return null;
  }
  return `$ ${v.toFixed(2)}`;
}
