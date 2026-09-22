/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';
import type { LocaleId, Messages } from '@/i18n/types';

import { NewMessageModal } from './new-message-modal';

jest.mock('@/modules/app-header/infrastructure/search.client', () => ({
  fetchUserSearchResults: jest.fn(),
}));

jest.mock('@/shared/presentation', () => ({
  AppModal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  AppModalCloseButton: ({ onClose, ariaLabel }: { onClose: () => void; ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClose}>
      Close
    </button>
  ),
  UserAvatar: ({ username }: { username: string }) => <span>{username}</span>,
}));

const { fetchUserSearchResults } = jest.requireMock(
  '@/modules/app-header/infrastructure/search.client',
) as { fetchUserSearchResults: jest.Mock };

const messages = {
  messaging_new_message: 'New message',
  messaging_search_user: 'Search users',
  messaging_start_chat: 'Start chat',
  messaging_group_title: 'Group name',
  messaging_group_title_placeholder: 'Optional group name',
  messaging_selected_users: 'Selected users',
  messaging_remove_selected_user: 'Remove {name}',
  close: 'Close',
  app_header_search_loading: 'Loading',
  search_empty_state: 'No results',
} as Messages;

function renderModal(
  props: Partial<React.ComponentProps<typeof NewMessageModal>> = {},
) {
  const onStartChat = jest.fn().mockResolvedValue(undefined);
  render(
    <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
      <NewMessageModal
        open
        onClose={jest.fn()}
        viewerUsername="alice"
        onStartChat={onStartChat}
        {...props}
      />
    </I18nProvider>,
  );
  return { onStartChat };
}

describe('NewMessageModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchUserSearchResults.mockResolvedValue([]);
  });

  it('disables start chat with zero selection', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Start chat' })).toBeDisabled();
  });

  it('starts DM for single selected user', async () => {
    fetchUserSearchResults.mockResolvedValue([
      { name: 'bob', profile_image: null },
    ]);
    const { onStartChat } = renderModal();

    fireEvent.change(screen.getByPlaceholderText('Search users'), {
      target: { value: 'bo' },
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /bob/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /bob/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));

    expect(onStartChat).toHaveBeenCalledWith({
      peers: ['bob'],
      title: undefined,
      peerAvatarUrl: null,
    });
    expect(screen.queryByText('Group name')).not.toBeInTheDocument();
  });

  it('starts group flow for multiple selected users', async () => {
    fetchUserSearchResults
      .mockResolvedValueOnce([{ name: 'bob', profile_image: null }])
      .mockResolvedValueOnce([{ name: 'carol', profile_image: null }]);
    const { onStartChat } = renderModal();

    fireEvent.change(screen.getByPlaceholderText('Search users'), {
      target: { value: 'bo' },
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /bob/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /bob/i }));

    fireEvent.change(screen.getByPlaceholderText('Search users'), {
      target: { value: 'ca' },
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /carol/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /carol/i }));

    expect(screen.getByText('Group name')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Optional group name'), {
      target: { value: 'Team' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));

    expect(onStartChat).toHaveBeenCalledWith({
      peers: ['bob', 'carol'],
      title: 'Team',
      peerAvatarUrl: undefined,
    });
  });
});
