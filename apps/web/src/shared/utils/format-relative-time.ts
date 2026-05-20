import type { LocaleId } from '@/i18n/types';

/**
 * Relative time for feed cards and notifications; falls back to medium date for older items.
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
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
      -min,
      'minute',
    );
  }
  const hours = Math.floor(min / 60);
  if (hours < 24) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
      -hours,
      'hour',
    );
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
      -days,
      'day',
    );
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
}
