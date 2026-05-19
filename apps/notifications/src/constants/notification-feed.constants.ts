/** 14 days — refreshed on each new notification */
export const NOTIFICATION_EXPIRY_SEC = 14 * 24 * 3600;

export const NOTIFICATION_LIST_MAX = 25;

/** Per-user feed list: `notifications:list:{username}` */
export const notificationListKey = (username: string): string =>
  `notifications:list:${username}`;
