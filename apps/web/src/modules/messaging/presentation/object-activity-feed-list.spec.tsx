/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';
import type { Messages } from '@/i18n/types';

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
  ModalShell: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  getImagePathPost: (url: string) => url,
  shouldUnoptimizeRemoteImage: () => true,
}));

jest.mock('@/shared/presentation/layout/hooks/use-breakpoint', () => ({
  useMediaQuery: () => false,
}));

import { ObjectActivityFeedList } from './object-activity-feed-list';
import type { MessageItem } from '../domain/messaging.types';

const messages = {
  object_activity_empty: 'No activity yet.',
  object_activity_encrypted_unsupported: 'Encrypted messages are not supported on object activity.',
  object_activity_original_date_caption: 'Originally {datetime}',
  messaging_loading_older: 'Loading older messages...',
} as Messages;

function renderList(items: MessageItem[]) {
  return render(
    <I18nProvider locale="en-US" messages={messages}>
      <ObjectActivityFeedList messages={items} viewerUsername="alice" />
    </I18nProvider>,
  );
}

const baseMessage: MessageItem = {
  message_id: 'm1',
  channel_id: 'obj-ch-1',
  author: 'bob',
  body: 'hello',
  encrypted_body: null,
  encryption: null,
  overflow_ref: null,
  reply_to: null,
  quote_json: null,
  attachments: null,
  mentions: [],
  created_at_unix: 1_700_000_000,
  original_created_at_unix: null,
  updated_at_unix: null,
  source_object: null,
  source: null,
  duplicate_of: null,
  duplicate_count: 1,
};

function messageWithBody(
  body: string,
  createdAtUnix: number,
  messageId: string,
): MessageItem {
  return {
    ...baseMessage,
    message_id: messageId,
    body,
    created_at_unix: createdAtUnix,
  };
}

/** True when `before` node appears above `after` in the document (feed top → bottom). */
function appearsBefore(before: Node, after: Node): boolean {
  return Boolean(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function messageWithStamp(
  body: string,
  createdAtUnix: number,
  originalCreatedAtUnix: number,
  messageId: string,
): MessageItem {
  return {
    ...baseMessage,
    message_id: messageId,
    body,
    created_at_unix: createdAtUnix,
    original_created_at_unix: originalCreatedAtUnix,
  };
}

describe('ObjectActivityFeedList', () => {
  it('sorts by original stamp so Dec 25 ranks above Nov 30 when published same day', () => {
    const published = 1_700_000_000;
    renderList([
      messageWithStamp('Friendly reminder', published, 1_701_302_400, 'm-nov'),
      messageWithStamp('Holiday Hours', published, 1_703_462_400, 'm-dec'),
    ]);

    expect(
      appearsBefore(
        screen.getByText('Holiday Hours'),
        screen.getByText('Friendly reminder'),
      ),
    ).toBe(true);
  });

  it('preserves API newest-first order within a day (newest at top)', () => {
    renderList([
      messageWithBody('newest message', 1_700_010_000, 'm-new'),
      messageWithBody('older message', 1_700_000_000, 'm-old'),
    ]);

    expect(
      appearsBefore(
        screen.getByText('newest message'),
        screen.getByText('older message'),
      ),
    ).toBe(true);
  });

  it('preserves paginated order when older pages are appended (newest stays on top)', () => {
    renderList([
      messageWithBody('initial newest', 1_700_020_000, 'm-init-new'),
      messageWithBody('initial older', 1_700_010_000, 'm-init-old'),
      messageWithBody('loaded oldest', 1_700_000_000, 'm-loaded-old'),
    ]);

    expect(
      appearsBefore(
        screen.getByText('initial newest'),
        screen.getByText('initial older'),
      ),
    ).toBe(true);
    expect(
      appearsBefore(
        screen.getByText('initial older'),
        screen.getByText('loaded oldest'),
      ),
    ).toBe(true);
  });

  it('preserves newest-first order across day groups', () => {
    renderList([
      messageWithBody('today message', 1_700_010_000, 'm-today'),
      messageWithBody('yesterday message', 1_699_000_000, 'm-yesterday'),
    ]);

    expect(
      appearsBefore(
        screen.getByText('today message'),
        screen.getByText('yesterday message'),
      ),
    ).toBe(true);
  });

  it('shows originally caption when stamp is present', () => {
    renderList([
      {
        ...baseMessage,
        original_created_at_unix: 1_262_304_000,
      },
    ]);

    expect(screen.getByText(/Originally/i)).toBeInTheDocument();
    expect(screen.getByText(/Originally Jan 1, 2010/i)).toBeInTheDocument();
  });

  it('shows created time only when stamp is absent', () => {
    renderList([baseMessage]);

    expect(screen.queryByText(/Originally/i)).not.toBeInTheDocument();
  });
});
