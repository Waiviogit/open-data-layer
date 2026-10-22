/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';
import type { LocaleId, Messages } from '@/i18n/types';

jest.mock('@/shared/presentation/navigation', () => ({
  OptimisticNavLink: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('@/shared/presentation', () => ({
  AppModal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  AppModalCloseButton: ({ onClose, ariaLabel }: { onClose: () => void; ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClose}>
      Close
    </button>
  ),
  ModalShell: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  SocialEmbedHtml: ({ html, className }: { html: string; className?: string }) => (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

jest.mock('@/shared/presentation/layout/hooks/use-breakpoint', () => ({
  useMediaQuery: () => false,
}));

jest.mock('@/modules/auth', () => ({
  useLoginModal: () => ({ openLogin: jest.fn() }),
  useHydrateWalletProvider: jest.fn(),
  getWalletFacade: () => ({
    getActiveProvider: () => 'keychain',
  }),
}));

import { MessagingMessageList } from './messaging-message-list';
import type { MessageItem } from '../domain/messaging.types';

const messages = {
  messaging_loading_older: 'Loading older messages...',
  messaging_message_encrypted: 'Encrypted message',
  messaging_message_one_way: 'One-way encrypted — only {to} can read',
} as Messages;

describe('MessagingMessageList', () => {
  it('renders outgoing message with accent-soft styling', () => {
    const items: MessageItem[] = [
      {
        message_id: '1',
        channel_id: 'dm-1',
        author: 'alice',
        body: 'hello',
        encrypted_body: null,
        encryption: null,
        overflow_ref: null,
        reply_to: null,
        quote_json: null,
        attachments: null,
        mentions: [],
        created_at_unix: 1_694_000_000,
        original_created_at_unix: null,
        updated_at_unix: null,
        source_object: null,
      },
    ];

    render(
      <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
        <MessagingMessageList messages={items} viewerUsername="alice" />
      </I18nProvider>,
    );

    const bubble = screen.getByText('hello').closest('.rounded-card');
    expect(bubble?.className).toContain('bg-accent-soft');
    expect(bubble?.className).not.toContain('bg-accent text-accent-fg');
  });

  it('renders incoming message with surface styling', () => {
    const items: MessageItem[] = [
      {
        message_id: '1',
        channel_id: 'dm-1',
        author: 'bob',
        body: 'hello',
        encrypted_body: null,
        encryption: null,
        overflow_ref: null,
        reply_to: null,
        quote_json: null,
        attachments: null,
        mentions: [],
        created_at_unix: 1_694_000_000,
        original_created_at_unix: null,
        updated_at_unix: null,
        source_object: null,
      },
    ];

    render(
      <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
        <MessagingMessageList messages={items} viewerUsername="alice" />
      </I18nProvider>,
    );

    const bubble = screen.getByText('hello').closest('.rounded-card');
    expect(bubble?.className).toContain('border-border');
    expect(bubble?.className).toContain('bg-surface');
  });

  it('links incoming author name to profile when showAuthorNames is enabled', () => {
    const items: MessageItem[] = [
      {
        message_id: '1',
        channel_id: 'obj-1',
        author: 'flowmaster',
        body: 'test',
        encrypted_body: null,
        encryption: null,
        overflow_ref: null,
        reply_to: null,
        quote_json: null,
        attachments: null,
        mentions: [],
        created_at_unix: 1_694_000_000,
        original_created_at_unix: null,
        updated_at_unix: null,
        source_object: null,
      },
    ];

    render(
      <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
        <MessagingMessageList
          messages={items}
          viewerUsername="alice"
          showAuthorNames
        />
      </I18nProvider>,
    );

    const link = screen.getByRole('link', { name: 'flowmaster' });
    expect(link).toHaveAttribute('href', '/@flowmaster');
  });

  it('renders one-way label for ephemeral outgoing messages', () => {
    const items: MessageItem[] = [
      {
        message_id: '1',
        channel_id: 'dm-1',
        author: 'alice',
        body: null,
        encrypted_body: '#AbC123',
        encryption: { v: 1, mode: 'ephemeral', to: 'bob' },
        overflow_ref: null,
        reply_to: null,
        quote_json: null,
        attachments: null,
        mentions: [],
        created_at_unix: 1_694_000_000,
        original_created_at_unix: null,
        updated_at_unix: null,
        source_object: null,
      },
    ];

    render(
      <I18nProvider locale={'en-US' as LocaleId} messages={messages}>
        <MessagingMessageList messages={items} viewerUsername="alice" />
      </I18nProvider>,
    );

    expect(screen.getByText('One-way encrypted — only bob can read')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encrypted message' })).not.toBeInTheDocument();
  });
});
