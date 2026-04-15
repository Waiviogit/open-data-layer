import { CASHOUT_OFFSET_DAYS } from '../../constants/thread-accounts';

/** Parse Hive block `timestamp` string to Unix seconds. */
export function blockTimestampToUnixSeconds(timestamp: string): number {
  const ms = Date.parse(timestamp);
  if (Number.isNaN(ms)) {
    return 0;
  }
  return Math.floor(ms / 1000);
}

/** `YYYY-MM-DDTHH:mm:ss` (UTC) for Hive-style text fields. */
export function formatHiveDateTime(isoTimestamp: string): string {
  const ms = Date.parse(isoTimestamp);
  if (Number.isNaN(ms)) {
    return '';
  }
  return new Date(ms).toISOString().slice(0, 19);
}

export function cashoutTimeFromBlock(blockIso: string): string {
  const d = new Date(blockIso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  d.setUTCDate(d.getUTCDate() + CASHOUT_OFFSET_DAYS);
  return d.toISOString().slice(0, 19);
}
