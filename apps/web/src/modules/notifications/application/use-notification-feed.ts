'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  countUnread,
  getLastSeen,
  prependNotificationItem,
  setLastSeen,
} from './notification-feed-utils';
import {
  getNotificationsWsClient,
  type UserNotificationItem,
} from '../infrastructure/notifications-ws-client';

export type UseNotificationFeedResult = {
  items: UserNotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  markRead: () => void;
};

export function useNotificationFeed(username: string): UseNotificationFeedResult {
  const [items, setItems] = useState<UserNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const syncUnread = useCallback(
    (nextItems: UserNotificationItem[]) => {
      setUnreadCount(countUnread(nextItems, getLastSeen(username)));
    },
    [username],
  );

  const markRead = useCallback(() => {
    const now = new Date().toISOString();
    setLastSeen(username, now);
    setUnreadCount(0);
  }, [username]);

  useEffect(() => {
    let cancelled = false;
    const client = getNotificationsWsClient();

    async function loadInitial(): Promise<void> {
      if (!client) {
        if (!cancelled) {
          setItems([]);
          setUnreadCount(0);
          setIsLoading(false);
        }
        return;
      }
      const fetched = await client.getNotifications();
      if (cancelled) {
        return;
      }
      setItems(fetched);
      syncUnread(fetched);
      setIsLoading(false);
    }

    void loadInitial();

    const unsubscribe = client?.addNotificationListener((item) => {
      setItems((prev) => {
        const next = prependNotificationItem(prev, item);
        if (next === prev) {
          return prev;
        }
        setUnreadCount((c) => c + 1);
        return next;
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [username, syncUnread]);

  return { items, unreadCount, isLoading, markRead };
}
