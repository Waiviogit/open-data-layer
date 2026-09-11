import type { UserNotificationSettings } from '@opden-data-layer/odl-db-types';

/** API view of notification settings (excludes legacy `deactivation_campaign`). */
export type UserNotificationSettingsView = Omit<
  UserNotificationSettings,
  'account' | 'deactivation_campaign'
>;

export function defaultUserNotificationSettingsView(): UserNotificationSettingsView {
  return {
    follow: true,
    reblog: true,
    reply: true,
    mention: true,
    vote: true,
    downvote: false,
    claimed_object_updates: true,
    group_id_control: true,
    followed_user_threads: true,
    transfer: true,
    fill_order: true,
    power_up: true,
    claim_reward: false,
    witness_vote: true,
    my_post: false,
    my_comment: false,
    my_like: false,
    minimal_transfer: 0,
    messages: true,
    obl: true,
  };
}

export function mapUserNotificationSettingsRow(
  row: UserNotificationSettings,
): UserNotificationSettingsView {
  const {
    account: _account,
    deactivation_campaign: _deactivationCampaign,
    ...view
  } = row;
  return view;
}
