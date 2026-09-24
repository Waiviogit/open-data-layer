/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';

import { WalletTransferModal } from './wallet-transfer-modal';

const mockHiveBroadcast = jest.fn();

jest.mock('@/shared/presentation', () => {
  const modal = jest.requireActual<typeof import('@/shared/presentation/components/app-modal')>(
    '@/shared/presentation/components/app-modal',
  );
  return {
    AppModal: modal.AppModal,
    AppModalCloseButton: modal.AppModalCloseButton,
    APP_MODAL_Z_INDEX: modal.APP_MODAL_Z_INDEX,
  };
});

jest.mock('@/modules/object-updates/presentation/components/user-ref-search-field', () => ({
  UserRefSearchField: () => null,
}));

jest.mock('../../hooks/use-engine-token-broadcast', () => ({
  useEngineTokenBroadcast: () => ({
    broadcast: jest.fn(),
    pending: false,
    error: null,
    setError: jest.fn(),
  }),
}));

jest.mock('../../hooks/use-hive-broadcast', () => ({
  useHiveBroadcast: () => ({
    broadcast: (...args: unknown[]) => mockHiveBroadcast(...args),
    pending: false,
    error: null,
    setError: jest.fn(),
  }),
}));

jest.mock('./wallet-balances-context', () => ({
  useWalletBalances: () => ({
    waivSummary: null,
    hiveSummary: {
      balance: { liquidHive: '10.000', hbdLiquid: '10.000' },
      rates: { hiveUsd: 0.3, hbdUsd: 1 },
    },
    engineSummary: null,
  }),
}));

const messages = {
  to: 'To',
  transfer_to_savings_title: 'Transfer to savings',
  amount: 'Amount',
  wallet_transfer_amount_placeholder: '0.000',
  wallet_transfer_value_usd: 'Value: {amount} USD',
  available: 'Available',
  memo_optional: 'Memo (optional)',
  wallet_transfer_memo_placeholder: 'Memo',
  wallet_broadcast_approval_note: 'You will be asked to approve this transaction.',
  transfer: 'Transfer',
  max: 'Max',
  search_placeholder: 'Search',
  search_empty_state: 'No results',
};

function renderDeposit(asset: 'HIVE' | 'HBD') {
  return render(
    <I18nProvider locale="en-US" messages={messages}>
      <WalletTransferModal
        open
        onClose={() => undefined}
        account="Alice"
        state={{ kind: 'transfer', asset, toSavings: true }}
      />
    </I18nProvider>,
  );
}

describe('WalletTransferModal deposit to savings', () => {
  beforeEach(() => {
    mockHiveBroadcast.mockReset();
    mockHiveBroadcast.mockResolvedValue(true);
  });

  it.each(['HIVE', 'HBD'] as const)(
    'hides To and credits the current account for %s',
    async (asset) => {
      renderDeposit(asset);

      expect(
        screen.getByRole('heading', { name: 'Transfer to savings' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'To:' })).not.toBeInTheDocument();

      fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), {
        target: { value: '1.5' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));

      await waitFor(() => {
        expect(mockHiveBroadcast).toHaveBeenCalledWith([
          {
            type: 'transfer_to_savings',
            from: 'Alice',
            to: 'alice',
            amount: `1.500 ${asset}`,
            memo: '',
          },
        ]);
      });
    },
  );
});
