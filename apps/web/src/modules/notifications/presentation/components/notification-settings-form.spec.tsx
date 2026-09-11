/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';

import { NotificationSettingsForm } from './notification-settings-form';
import type { NotificationSettingsFormState } from '../../application/notification-settings.types';

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const initialSettings: NotificationSettingsFormState = {
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

describe('NotificationSettingsForm', () => {
  it('renders sections and calls onSave with current form state', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    render(
      <NotificationSettingsForm
        initialSettings={initialSettings}
        pending={false}
        onSave={onSave}
      />,
    );

    expect(screen.getByText('community_actions')).toBeInTheDocument();
    expect(screen.getByText('wallet_transactions')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(onSave).toHaveBeenCalledWith(initialSettings);
  });

  it('shows save error when provided', () => {
    render(
      <NotificationSettingsForm
        initialSettings={initialSettings}
        pending={false}
        saveError="wallet_broadcast_keychain_missing"
        onSave={jest.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('wallet_broadcast_keychain_missing');
  });
});
