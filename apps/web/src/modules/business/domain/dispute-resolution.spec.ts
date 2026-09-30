import {
  canViewerResolveDispute,
  disputeAuthorityForInvoice,
} from './dispute-resolution';
import type { LedgerContractRow, LedgerDisputeRow, LedgerInvoiceRow } from './ledger.types';

describe('dispute-resolution', () => {
  const invoice: LedgerInvoiceRow = {
    invoice_id: 'inv-1',
    contract_id: 'c-1',
    debtor: 'bob',
    creditor: 'alice',
    issuer: 'alice',
    amount_usd: '100',
    state: 'disputed',
    created_at: '2026-01-01T00:00:00.000Z',
  };

  const contract: LedgerContractRow = {
    contract_id: 'c-1',
    offer_id: 'offer-1',
    offer_version: 1,
    provider: 'alice',
    client: 'bob',
    dispute_rule: 'client',
    arbiter: null,
    offer_name: 'API',
    offer_description: null,
    offer_status: 'active',
    service_order_schema: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  const dispute: LedgerDisputeRow = {
    dispute_id: 'd-1',
    invoice_id: 'inv-1',
    disputant: 'bob',
    proposed_amount_usd: '80',
    status: 'open',
    created_at: '2026-01-02T00:00:00.000Z',
  };

  it('resolves client rule to client account', () => {
    const authority = disputeAuthorityForInvoice(invoice, [contract]);
    expect(authority.resolverAccount).toBe('bob');
  });

  it('allows client to resolve open dispute', () => {
    expect(canViewerResolveDispute('bob', dispute, [invoice], [contract])).toBe(true);
    expect(canViewerResolveDispute('alice', dispute, [invoice], [contract])).toBe(false);
  });

  it('resolves provider rule using governing contract outside pair contracts list', () => {
    const providerContract: LedgerContractRow = {
      ...contract,
      dispute_rule: 'provider',
      provider: 'alice',
      client: 'bob',
    };
    expect(
      canViewerResolveDispute('alice', dispute, [], [], {
        invoice,
        governingContract: providerContract,
      }),
    ).toBe(true);
  });
});
