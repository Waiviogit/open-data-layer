import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import { InvoiceIssueHandler } from './invoice-issue.handler';
import { OblContract } from '@opden-data-layer/odl-db-types';
import { mockOblNotifications } from '../obl-notification.service.spec-helpers';

const governingContract: OblContract = {
  contract_id: 'c-1',
  offer_id: 'offer-1',
  offer_version: 1,
  provider: 'organizer',
  client: 'sponsor',
  dispute_rule: 'client',
  arbiter: null,
  metadata: {},
  service_order_schema: null,
  pair_low: 'organizer',
  pair_high: 'sponsor',
  created_event_seq: BigInt(1),
  transaction_id: 'tx-contract',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

function ctx(creator: string): OdlEventContext {
  return {
    action: 'invoice_issue',
    creator,
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-inv',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(100),
    eventIdIndexMap: new Map(),
  };
}

describe('InvoiceIssueHandler', () => {
  let handler: InvoiceIssueHandler;
  let findInvoice: jest.Mock;
  let findContract: jest.Mock;
  let hasLedgerForPair: jest.Mock;
  let runInTransaction: jest.Mock;
  let insertInvoice: jest.Mock;
  let insertObligationLines: jest.Mock;
  let insertLedger: jest.Mock;
  let findServiceOrder: jest.Mock;
  let findReport: jest.Mock;
  let oblNotifications: ReturnType<typeof mockOblNotifications>;

  beforeEach(() => {
    findInvoice = jest.fn().mockResolvedValue(null);
    findContract = jest.fn().mockResolvedValue(governingContract);
    hasLedgerForPair = jest.fn().mockResolvedValue(false);
    insertInvoice = jest.fn().mockResolvedValue(undefined);
    insertObligationLines = jest.fn().mockResolvedValue(undefined);
    insertLedger = jest.fn().mockResolvedValue(undefined);
    findServiceOrder = jest.fn();
    findReport = jest.fn();
    runInTransaction = jest.fn(async (fn: (trx: unknown) => Promise<void>) => fn({}));
    oblNotifications = mockOblNotifications();
    handler = new InvoiceIssueHandler({
      findInvoice,
      findContract,
      hasLedgerForPair,
      runInTransaction,
      insertInvoice,
      insertObligationLines,
      insertLedger,
      findServiceOrder,
      findReport,
    } as unknown as OblRepository, oblNotifications.service);
  });

  it('issues classic single invoice when pair ledger exists', async () => {
    hasLedgerForPair.mockResolvedValue(true);
    await handler.handle(
      {
        invoice_id: 'inv-1',
        issuer: 'alice',
        debtor: 'bob',
        creditor: 'alice',
        amount_usd: '10',
      },
      ctx('alice'),
    );
    expect(insertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'single', debtor: 'bob' }),
      expect.anything(),
    );
    expect(insertObligationLines).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          beneficiary: 'alice',
          state: 'confirmed',
          dispute_group: 'inv-1',
        }),
      ],
      expect.anything(),
    );
    expect(insertLedger).not.toHaveBeenCalled();
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_invoice_issue',
        actor: 'alice',
        payload: expect.objectContaining({
          invoiceId: 'inv-1',
          issuer: 'alice',
          debtor: 'bob',
          beneficiaries: ['alice'],
        }),
      }),
    );
  });

  it('issues pending line when pair ledger does not exist', async () => {
    hasLedgerForPair.mockResolvedValue(false);
    await handler.handle(
      {
        invoice_id: 'inv-pending',
        issuer: 'alice',
        debtor: 'bob',
        creditor: 'alice',
        amount_usd: '10',
      },
      ctx('alice'),
    );
    expect(insertObligationLines).toHaveBeenCalledWith(
      [expect.objectContaining({ state: 'pending', beneficiary: 'alice' })],
      expect.anything(),
    );
    expect(insertLedger).not.toHaveBeenCalled();
  });

  it('auto-starts ledger for attestor beneficiary invoice', async () => {
    await handler.handle(
      {
        invoice_id: 'inv-2',
        issuer: 'organizer',
        debtor: 'sponsor',
        beneficiaries: [{ beneficiary: 'winner', amount_usd: '5', role: 'user_reward' }],
        contract_id: 'c-1',
      },
      ctx('organizer'),
    );
    expect(findContract).toHaveBeenCalledWith('c-1');
    expect(insertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'single' }),
      expect.anything(),
    );
    expect(insertLedger).toHaveBeenCalled();
    expect(insertObligationLines).toHaveBeenCalledWith(
      [expect.objectContaining({ beneficiary: 'winner', state: 'confirmed', role: 'user_reward' })],
      expect.anything(),
    );
  });

  it('rejects attestor invoice without governing contract', async () => {
    await handler.handle(
      {
        invoice_id: 'inv-3',
        issuer: 'organizer',
        debtor: 'sponsor',
        beneficiaries: [{ beneficiary: 'winner', amount_usd: '5' }],
      },
      ctx('organizer'),
    );
    expect(insertInvoice).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('issues multi invoice with multiple lines', async () => {
    await handler.handle(
      {
        invoice_id: 'inv-4',
        issuer: 'organizer',
        debtor: 'sponsor',
        contract_id: 'c-1',
        beneficiaries: [
          { beneficiary: 'winner', amount_usd: '5' },
          { beneficiary: 'referral', amount_usd: '1', role: 'referral_fee' },
        ],
      },
      ctx('organizer'),
    );
    expect(insertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'multi' }),
      expect.anything(),
    );
    expect(insertObligationLines).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ beneficiary: 'winner' }),
        expect.objectContaining({ beneficiary: 'referral', role: 'referral_fee' }),
      ]),
      expect.anything(),
    );
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_invoice_issue',
        payload: expect.objectContaining({
          amountUsd: '6.00000000',
          beneficiaries: ['winner', 'referral'],
        }),
      }),
    );
  });

  it('stores service_order_id and report_id when refs validate', async () => {
    hasLedgerForPair.mockResolvedValue(true);
    findServiceOrder.mockResolvedValue({
      service_order_id: 'so-1',
      contract_id: 'c-1',
    });
    findReport.mockResolvedValue({
      report_id: 'r-1',
      contract_id: 'c-1',
      service_order_id: 'so-1',
    });
    await handler.handle(
      {
        invoice_id: 'inv-refs',
        issuer: 'organizer',
        debtor: 'sponsor',
        creditor: 'organizer',
        amount_usd: '10',
        contract_id: 'c-1',
        service_order_id: 'so-1',
        report_id: 'r-1',
      },
      ctx('organizer'),
    );
    expect(insertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        service_order_id: 'so-1',
        report_id: 'r-1',
      }),
      expect.anything(),
    );
  });

  it('nulls missing service_order_id and keeps invoice', async () => {
    hasLedgerForPair.mockResolvedValue(true);
    findServiceOrder.mockResolvedValue(null);
    await handler.handle(
      {
        invoice_id: 'inv-so-miss',
        issuer: 'alice',
        debtor: 'bob',
        creditor: 'alice',
        amount_usd: '10',
        service_order_id: 'so-missing',
      },
      ctx('alice'),
    );
    expect(insertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        service_order_id: null,
        report_id: null,
      }),
      expect.anything(),
    );
  });

  it('nulls service_order_id on contract mismatch', async () => {
    hasLedgerForPair.mockResolvedValue(true);
    findServiceOrder.mockResolvedValue({
      service_order_id: 'so-1',
      contract_id: 'c-other',
    });
    await handler.handle(
      {
        invoice_id: 'inv-so-mismatch',
        issuer: 'organizer',
        debtor: 'sponsor',
        creditor: 'organizer',
        amount_usd: '10',
        contract_id: 'c-1',
        service_order_id: 'so-1',
      },
      ctx('organizer'),
    );
    expect(insertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        service_order_id: null,
      }),
      expect.anything(),
    );
  });

  it('nulls report_id when report service_order disagrees with resolved SO', async () => {
    hasLedgerForPair.mockResolvedValue(true);
    findServiceOrder.mockResolvedValue({
      service_order_id: 'so-1',
      contract_id: 'c-1',
    });
    findReport.mockResolvedValue({
      report_id: 'r-1',
      contract_id: 'c-1',
      service_order_id: 'so-other',
    });
    await handler.handle(
      {
        invoice_id: 'inv-rep-mismatch',
        issuer: 'organizer',
        debtor: 'sponsor',
        creditor: 'organizer',
        amount_usd: '10',
        contract_id: 'c-1',
        service_order_id: 'so-1',
        report_id: 'r-1',
      },
      ctx('organizer'),
    );
    expect(insertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        service_order_id: 'so-1',
        report_id: null,
      }),
      expect.anything(),
    );
  });
});
