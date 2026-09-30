/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

import { I18nProvider } from '@/i18n/providers/i18n-provider';

import type { LedgerServiceOrderRow } from '../../../domain/ledger.types';
import { BusinessServiceOrderCard } from './business-service-order-card';

jest.mock('@/modules/user-activity/presentation/components/activity-timestamp', () => ({
  ActivityTimestamp: ({ timestamp }: { timestamp: string }) => <time>{timestamp}</time>,
}));

const messages = {
  business_field_contract: 'Contract',
  business_field_created_at: 'Created',
  business_cancel_service_order: 'Cancel service order',
  business_state_cancelled: 'Cancelled',
};

function so(overrides: Partial<LedgerServiceOrderRow> = {}): LedgerServiceOrderRow {
  return {
    service_order_id: 'so-1',
    contract_id: 'c-1',
    creator: 'alice',
    provider: 'alice',
    client: 'bob',
    details: {},
    status: 'active',
    cancelled_by: null,
    cancelled_at: null,
    created_event_seq: '10',
    transaction_id: 'tx',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderCard(
  row: LedgerServiceOrderRow,
  username: string,
  extras: { linkedContract?: string | null; linkedContractUrl?: string | null } = {},
) {
  return render(
    <I18nProvider locale="en-US" messages={messages}>
      <BusinessServiceOrderCard
        so={row}
        username={username}
        linkedContract={extras.linkedContract ?? null}
        linkedContractUrl={extras.linkedContractUrl ?? null}
        isBusy={false}
        onCancel={jest.fn()}
      />
    </I18nProvider>,
  );
}

describe('BusinessServiceOrderCard', () => {
  it('shows Cancel when the order is active and the viewer is a party', () => {
    renderCard(so(), 'alice');
    expect(screen.getByRole('button', { name: 'Cancel service order' })).toBeInTheDocument();
  });

  it('hides Cancel and shows cancelled badge after cancel', () => {
    renderCard(
      so({ status: 'cancelled', cancelled_by: 'bob' }),
      'alice',
    );
    expect(screen.queryByRole('button', { name: 'Cancel service order' })).not.toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('hides Cancel when the viewer is not a party', () => {
    renderCard(so(), 'carol');
    expect(screen.queryByRole('button', { name: 'Cancel service order' })).not.toBeInTheDocument();
  });

  it('links the contract label when linkedContractUrl is set', () => {
    renderCard(so(), 'alice', {
      linkedContract: 'Offer A · c-1',
      linkedContractUrl: '/business/contracts/c-1',
    });
    expect(screen.getByRole('link', { name: 'Offer A · c-1' })).toHaveAttribute(
      'href',
      '/business/contracts/c-1',
    );
  });
});
