'use client';

import { useEffect } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { useNotificationFeed } from '../../application/use-notification-feed';
import { NotificationRow } from './notification-row';

export type NotificationsPageClientProps = {
  username: string;
};

function NotificationRowSkeleton() {
  return (
    <div className="flex gap-3 px-3 py-3 animate-pulse">
      <div className="h-[18px] w-[18px] shrink-0 rounded bg-surface-control" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-full max-w-md rounded bg-surface-control" />
        <div className="h-3 w-16 rounded bg-surface-control" />
      </div>
    </div>
  );
}

export function NotificationsPageClient({ username }: NotificationsPageClientProps) {
  const { t } = useI18n();
  const { items, isLoading, markRead } = useNotificationFeed(username);

  useEffect(() => {
    markRead();
  }, [markRead]);

  return (
    <div className="mx-auto w-full max-w-feed px-page-x py-page-y">
      <h1 className="text-heading-lg text-heading mb-6">{t('notifications')}</h1>

      {isLoading ? (
        <div className="rounded-card border border-border bg-surface">
          {Array.from({ length: 5 }, (_, i) => (
            <NotificationRowSkeleton key={i} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="divide-y divide-border rounded-card border border-border bg-surface">
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-body text-fg-muted">{t('notifications_empty_message')}</p>
      )}
    </div>
  );
}
