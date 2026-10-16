'use client';

import { useEffect, useState } from 'react';

import { getNotificationsWsClient } from '@/modules/notifications/infrastructure/notifications-ws-client';
import { refreshMessagesUnreadCountAction } from '@/modules/user-profile/infrastructure/feed-unread.actions';

const INBOX_NOTIFICATION_TYPES = new Set(['message_direct', 'message_group']);
const MESSAGES_UNREAD_REFRESH_DEBOUNCE_MS = 300;

export function useMessagesUnreadCount(
  username: string,
  initialCount: number,
): number {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!username.trim()) {
      return;
    }
    const client = getNotificationsWsClient();
    if (!client) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = client.addNotificationListener((item) => {
      if (!INBOX_NOTIFICATION_TYPES.has(item.type)) {
        return;
      }
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        void refreshMessagesUnreadCountAction().then((next) => {
          if (next != null) {
            setCount(next);
          }
        });
      }, MESSAGES_UNREAD_REFRESH_DEBOUNCE_MS);
    });
    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      unsubscribe();
    };
  }, [username]);

  return count;
}
