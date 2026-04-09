/**
 * Short relative time for draft `lastUpdated` (ms since epoch).
 */
export function formatDraftRelativeTime(locale: string, lastUpdatedMs: number): string {
  const diffMs = lastUpdatedMs - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const sec = abs / 1000;
  if (sec < 60) {
    return rtf.format(Math.round(diffMs / 1000), 'second');
  }
  const min = abs / 60000;
  if (min < 60) {
    return rtf.format(Math.round(diffMs / 60000), 'minute');
  }
  const hours = abs / 3600000;
  if (hours < 24) {
    return rtf.format(Math.round(diffMs / 3600000), 'hour');
  }
  const days = abs / 86400000;
  if (days < 30) {
    return rtf.format(Math.round(diffMs / 86400000), 'day');
  }
  const months = abs / (86400000 * 30);
  if (months < 12) {
    return rtf.format(Math.round(diffMs / (86400000 * 30)), 'month');
  }
  return rtf.format(Math.round(diffMs / (86400000 * 365)), 'year');
}