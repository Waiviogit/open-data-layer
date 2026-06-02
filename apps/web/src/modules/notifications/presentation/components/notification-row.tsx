'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { formatRelativeFeedTime } from '@/shared/utils/format-relative-time';

import {
  applyNotificationParams,
  formatNotification,
  notificationIconType,
} from '../../domain/format-notification';
import type { UserNotificationItem } from '../../infrastructure/notifications-ws-client';

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function FollowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function VoteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 9V5a3 3 0 0 0-6 0v4" />
      <path d="M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function NotificationTypeIcon({ item }: { item: UserNotificationItem }) {
  const iconType = notificationIconType(item);
  const className = 'shrink-0 text-fg-secondary';
  if (iconType === 'follow') {
    return <FollowIcon className={className} />;
  }
  if (iconType === 'vote') {
    return <VoteIcon className={className} />;
  }
  return <BellIcon className={className} />;
}

export type NotificationRowProps = {
  item: UserNotificationItem;
};

export function NotificationRow({ item }: NotificationRowProps) {
  const { t, locale } = useI18n();
  const formatted = formatNotification(item);
  const message = applyNotificationParams(t(formatted.key), formatted.params);
  const timeLabel = formatRelativeFeedTime(item.occurredAt, locale);

  return (
    <div className="flex gap-3 px-3 py-2.5">
      <NotificationTypeIcon item={item} />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm text-fg leading-body">{message}</p>
        <p className="mt-0.5 text-nano text-fg-muted">{timeLabel}</p>
      </div>
    </div>
  );
}
