import type { UserNotificationSettings } from '@opden-data-layer/odl-db-types';

/** Settings without the owning account — gating never needs the account name. */
export type NotificationSettingsView = Omit<UserNotificationSettings, 'account'>;

/**
 * Applied to registered ODL accounts that have no `user_notification_settings` row.
 * Mirrors the column defaults of `user_notification_settings`
 * (see libs/migrations/src/postgres/odl/00001_odl_schema.ts, 00050_user_notification_settings_columns.ts,
 * 00056_user_notification_settings_messages.ts, 00063_user_notification_settings_obl.ts),
 * matching the legacy Mongoose defaults of `UserNotificationsSchema`.
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsView = {
  deactivation_campaign: true,
  follow: true,
  fill_order: true,
  mention: true,
  minimal_transfer: 0,
  reblog: true,
  reply: true,
  transfer: true,
  power_up: true,
  witness_vote: true,
  my_post: false,
  my_comment: false,
  my_like: false,
  vote: true,
  downvote: false,
  claim_reward: false,
  claimed_object_updates: true,
  group_id_control: true,
  followed_user_threads: true,
  messages: true,
  obl: true,
};
