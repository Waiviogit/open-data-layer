/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';
import type { ActivityRowView } from '@/modules/user-activity/domain/types/activity-row-view';

import { WalletHistoryRow } from './wallet-history-row';

jest.mock('@/shared/presentation', () => ({
  UserAvatar: ({ username }: { username: string }) => (
    <span data-testid="avatar">{username}</span>
  ),
}));

const messages: Record<string, string> = {
  power_up: 'Power up',
  activity_from: 'from',
  activity_to: 'to',
  fillOrder_wallet_get: 'Bought {open_pays} from {exchanger}',
  fillOrder_wallet_transferred: 'Sold {current_pays} to {exchanger}',
  power_down_started: 'Started power down',
  activity_power_down_stop: 'Stopped power down',
  power_down_stopped: 'Power down',
  power_down_withdraw: 'Power down',
  cancel_transfer_from_savings: 'Cancel transfer from savings (request {requestId})',
  withdraw_from_savings: 'Withdraw from savings (request {requestId})',
};

function renderRow(row: ActivityRowView, accountName = 'alice') {
  return render(
    <I18nProvider locale="en-US" messages={messages}>
      <WalletHistoryRow row={row} accountName={accountName} />
    </I18nProvider>,
  );
}

describe('WalletHistoryRow', () => {
  it('renders power up without duplicate username in text', () => {
    const row: ActivityRowView = {
      kind: 'wallet_power_up',
      id: '1',
      timestamp: '2024-01-01T00:00:00Z',
      direction: 'in',
      amount: '1.000',
      currency: 'HP',
      counterparty: 'bob',
    };
    renderRow(row);
    expect(screen.getByText(/Power up from/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@bob' })).toBeInTheDocument();
    expect(screen.queryByText(/@bob.*@bob/)).not.toBeInTheDocument();
  });

  it('renders fill order buyer label', () => {
    const row: ActivityRowView = {
      kind: 'wallet_fill_order',
      id: '2',
      timestamp: '2024-01-01T00:00:01Z',
      currentPays: '10.000 HIVE',
      openPays: '2.000 HBD',
      exchanger: 'bob',
      transferAmount: '2.000 HBD',
      receivedAmount: '10.000 HIVE',
      isSeller: false,
    };
    renderRow(row);
    expect(screen.getByText(/Bought 2\.000 HBD from/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@bob' })).toBeInTheDocument();
  });

  it('renders power down withdraw with from label', () => {
    const row: ActivityRowView = {
      kind: 'wallet_power_down',
      id: '3',
      timestamp: '2024-01-01T00:00:02Z',
      subtype: 'withdraw',
      hpAmount: '1.000 HP',
      counterparty: 'bob',
      direction: 'in',
    };
    renderRow(row);
    expect(screen.getByText(/Power down from/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@bob' })).toBeInTheDocument();
  });

  it('renders power down start as unsigned black amount', () => {
    const row: ActivityRowView = {
      kind: 'wallet_power_down',
      id: '3c',
      timestamp: '2026-07-28T12:03:33Z',
      subtype: 'start',
      hpAmount: '1905.316 HP',
    };
    renderRow(row);
    expect(screen.getByText('Started power down')).toBeInTheDocument();
    const amount = screen.getByText('1905.316 HP');
    expect(amount).toHaveClass('text-fg');
    expect(amount).not.toHaveClass('text-error');
    expect(amount.textContent).toBe('1905.316 HP');
  });

  it('renders power down stop as Stopped power down without amount', () => {
    const row: ActivityRowView = {
      kind: 'wallet_power_down',
      id: '3d',
      timestamp: '2026-10-20T12:00:00Z',
      subtype: 'stop',
      hpAmount: '0.000 HP',
    };
    renderRow(row);
    expect(screen.getByText('Stopped power down')).toBeInTheDocument();
    expect(screen.queryByText('0.000 HP')).not.toBeInTheDocument();
    expect(screen.queryByText('Power down')).not.toBeInTheDocument();
  });

  it('renders self power down withdraw without from/to suffix', () => {
    const row: ActivityRowView = {
      kind: 'wallet_power_down',
      id: '3b',
      timestamp: '2024-01-01T00:00:02Z',
      subtype: 'withdraw',
      hpAmount: '1.000 HP',
      counterparty: '',
      direction: 'in',
    };
    renderRow(row);
    expect(screen.getByText('Power down')).toBeInTheDocument();
    expect(screen.queryByText(/Power down from/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Power down to/)).not.toBeInTheDocument();
  });

  it('renders savings cancel with requestId', () => {
    const row: ActivityRowView = {
      kind: 'wallet_savings',
      id: '4',
      timestamp: '2024-01-01T00:00:03Z',
      operationType: 'cancel_transfer_from_savings',
      amount: '1.000',
      currency: 'HIVE',
      requestId: '99',
    };
    renderRow(row);
    expect(
      screen.getByText('Cancel transfer from savings (request 99)'),
    ).toBeInTheDocument();
  });
});
