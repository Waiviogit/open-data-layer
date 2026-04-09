import type { LocaleId } from '@/i18n/types';

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

/**
 * Relative time for feed cards; falls back to medium date for older posts.
 */
export function formatRelativeFeedTime(iso: string, locale: LocaleId): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const now = Date.now();
  const diffMs = now - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) {
    return 'just now';
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-min, 'minute');
  }
  const hours = Math.floor(min / 60);
  if (hours < 24) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-hours, 'hour');
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
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
