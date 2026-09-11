import { mapApiToForm, mapFormToBroadcastPayload } from './map-notification-settings';
import type { NotificationSettingsFormState } from './notification-settings.types';

const sample: NotificationSettingsFormState = {
  follow: true,
  reblog: false,
  reply: true,
  mention: true,
  vote: true,
  downvote: false,
  claimed_object_updates: true,
  group_id_control: false,
  followed_user_threads: true,
  transfer: true,
  fill_order: true,
  power_up: false,
  claim_reward: false,
  witness_vote: true,
  my_post: false,
  my_comment: true,
  my_like: false,
  minimal_transfer: 2.5,
  messages: true,
  obl: true,
};

describe('map-notification-settings', () => {
  it('mapApiToForm copies dto fields', () => {
    expect(mapApiToForm(sample)).toEqual(sample);
  });

  it('mapFormToBroadcastPayload passes through all settings fields', () => {
    expect(mapFormToBroadcastPayload(sample)).toEqual(sample);
  });
});
