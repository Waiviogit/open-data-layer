'use client';

import type { ReactNode } from 'react';

import { configureNotificationsWsUrl } from '../infrastructure/notifications-ws-client';

export type NotificationsWsConfigProviderProps = {
  wsUrl: string;
  children: ReactNode;
};

/** Sets WS URL before child hooks call `getNotificationsWsClient()`. */
export function NotificationsWsConfigProvider({
  wsUrl,
  children,
}: NotificationsWsConfigProviderProps) {
  configureNotificationsWsUrl(wsUrl);
  return children;
}
