'use client';

import { useLayoutEffect, type ReactNode } from 'react';

import { configureNotificationsWsUrl } from '../infrastructure/notifications-ws-client';

export type NotificationsWsConfigProviderProps = {
  wsUrl: string;
  children: ReactNode;
};

export function NotificationsWsConfigProvider({
  wsUrl,
  children,
}: NotificationsWsConfigProviderProps) {
  useLayoutEffect(() => {
    configureNotificationsWsUrl(wsUrl);
  }, [wsUrl]);
  return children;
}
