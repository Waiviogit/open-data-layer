'use client';

import { useEffect, useState } from 'react';

import { getNotificationsWsClient } from '@/modules/notifications/infrastructure/notifications-ws-client';

const INBOX_NOTIFICATION_TYPES = new Set(['message_direct', 'message_group']);

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
    return client.addNotificationListener((item) => {
      if (INBOX_NOTIFICATION_TYPES.has(item.type)) {
        setCount((current) => current + 1);
      }
    });
  }, [username]);

  return count;
}
