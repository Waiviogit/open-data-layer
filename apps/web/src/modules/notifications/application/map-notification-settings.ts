import type { NotificationSettingsDto, NotificationSettingsFormState } from './notification-settings.types';

export function mapApiToForm(dto: NotificationSettingsDto): NotificationSettingsFormState {
  return { ...dto };
}

export function mapFormToBroadcastPayload(
  form: NotificationSettingsFormState,
): NotificationSettingsDto {
  return {
    follow: form.follow,
    reblog: form.reblog,
    reply: form.reply,
    mention: form.mention,
    vote: form.vote,
    downvote: form.downvote,
    claimed_object_updates: form.claimed_object_updates,
    group_id_control: form.group_id_control,
    followed_user_threads: form.followed_user_threads,
    transfer: form.transfer,
    fill_order: form.fill_order,
    power_up: form.power_up,
    claim_reward: form.claim_reward,
    witness_vote: form.witness_vote,
    my_post: form.my_post,
    my_comment: form.my_comment,
    my_like: form.my_like,
    minimal_transfer: form.minimal_transfer,
    messages: form.messages,
    obl: form.obl,
  };
}
