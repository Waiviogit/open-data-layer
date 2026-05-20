const storage = new Map<string, string>();

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    },
    configurable: true,
  });
});

import {
  countUnread,
  lastSeenStorageKey,
  prependNotificationItem,
  setLastSeen,
  getLastSeen,
} from './notification-feed-utils';
import type { UserNotificationItem } from '../infrastructure/notifications-ws-client';

function item(
  id: string,
  occurredAt: string,
): UserNotificationItem {
  return {
    id,
    type: 'follow',
    occurredAt,
    blockNum: 1,
    trxId: null,
    objectId: null,
    actor: 'alice',
    payload: {},
  };
}

describe('notification-feed-utils', () => {
  const username = 'testuser';

  beforeEach(() => {
    localStorage.clear();
  });

  it('lastSeenStorageKey includes username', () => {
    expect(lastSeenStorageKey(username)).toBe(
      'odl_notifications_last_seen_testuser',
    );
  });

  it('countUnread returns all items when lastSeen is null', () => {
    const items = [
      item('1', '2026-05-19T10:00:00.000Z'),
      item('2', '2026-05-19T11:00:00.000Z'),
    ];
    expect(countUnread(items, null)).toBe(2);
  });

  it('countUnread excludes items at or before lastSeen', () => {
    const items = [
      item('1', '2026-05-19T10:00:00.000Z'),
      item('2', '2026-05-19T12:00:00.000Z'),
    ];
    expect(countUnread(items, '2026-05-19T11:00:00.000Z')).toBe(1);
  });

  it('setLastSeen and getLastSeen round-trip in localStorage', () => {
    const iso = '2026-05-19T15:00:00.000Z';
    setLastSeen(username, iso);
    expect(getLastSeen(username)).toBe(iso);
  });

  it('prependNotificationItem prepends and deduplicates by id', () => {
    const existing = [item('1', '2026-05-19T10:00:00.000Z')];
    const newer = item('2', '2026-05-19T12:00:00.000Z');
    const next = prependNotificationItem(existing, newer);
    expect(next).toHaveLength(2);
    expect(next[0]?.id).toBe('2');

    const dup = prependNotificationItem(next, newer);
    expect(dup).toBe(next);
  });
});
