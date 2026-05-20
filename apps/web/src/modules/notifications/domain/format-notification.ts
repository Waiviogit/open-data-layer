import type { UserNotificationItem } from '../infrastructure/notifications-ws-client';

export type NotificationIconType = 'follow' | 'vote' | 'generic';

export type FormattedNotification = {
  key: string;
  params?: Record<string, string>;
};

export function formatNotification(item: UserNotificationItem): FormattedNotification {
  const actor = item.actor?.trim() ?? '';

  switch (item.type) {
    case 'follow':
      return {
        key: 'notification_following_username',
        params: { username: actor || '?' },
      };
    case 'update_vote_cast':
      return {
        key: 'notification_upvoted_username_post',
        params: { username: actor || '?' },
      };
    default:
      return { key: 'notification_generic_default_message' };
  }
}

export function notificationIconType(item: UserNotificationItem): NotificationIconType {
  switch (item.type) {
    case 'follow':
      return 'follow';
    case 'update_vote_cast':
      return 'vote';
    default:
      return 'generic';
  }
}

/** Substitutes `{param}` placeholders in an i18n template string. */
export function applyNotificationParams(
  template: string,
  params?: Record<string, string>,
): string {
  if (!params) {
    return template;
  }
  let out = template;
  for (const [key, value] of Object.entries(params)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}
