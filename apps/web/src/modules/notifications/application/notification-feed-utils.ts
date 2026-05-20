import { NOTIFICATIONS_LAST_SEEN_KEY_PREFIX } from '../constants';
import type { UserNotificationItem } from '../infrastructure/notifications-ws-client';

export function lastSeenStorageKey(username: string): string {
  return `${NOTIFICATIONS_LAST_SEEN_KEY_PREFIX}${username.trim()}`;
}

function notificationStorage(): Storage | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage;
}

export function getLastSeen(username: string): string | null {
  const storage = notificationStorage();
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(lastSeenStorageKey(username));
  return raw?.trim() ? raw.trim() : null;
}

export function setLastSeen(username: string, iso: string): void {
  const storage = notificationStorage();
  if (!storage) {
    return;
  }
  storage.setItem(lastSeenStorageKey(username), iso);
}

export function countUnread(
  items: UserNotificationItem[],
  lastSeen: string | null,
): number {
  if (!lastSeen) {
    return items.length;
  }
  const seenMs = new Date(lastSeen).getTime();
  if (Number.isNaN(seenMs)) {
    return items.length;
  }
  return items.filter((item) => {
    const ms = new Date(item.occurredAt).getTime();
    return !Number.isNaN(ms) && ms > seenMs;
  }).length;
}

export function prependNotificationItem(
  items: UserNotificationItem[],
  item: UserNotificationItem,
): UserNotificationItem[] {
  if (items.some((existing) => existing.id === item.id)) {
    return items;
  }
  return [item, ...items];
}
