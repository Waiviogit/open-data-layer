import type { OdlEventContext } from '../../odl-shared';
import type { OblRepository } from '../../../repositories/obl.repository';
import { DisputeResolveHandler } from './dispute-resolve.handler';
import { OblInvoice, OblObligationLine } from '@opden-data-layer/odl-db-types';
import { mockOblNotifications } from '../obl-notification.service.spec-helpers';

const invoiceHeader: OblInvoice = {
  invoice_id: 'inv-1',
  contract_id: null,
  service_order_id: null,
  report_id: null,
  issuer: 'alice',
  debtor: 'bob',
  kind: 'single',
  details: {},
  created_event_seq: BigInt(10),
  transaction_id: 'tx-inv',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

const disputedLine = (overrides: Partial<OblObligationLine> = {}): OblObligationLine => ({
  line_id: 'inv-1:0',
  invoice_id: 'inv-1',
  debtor: 'bob',
  beneficiary: 'alice',
  amount_usd: '10.00000000',
  final_amount_usd: null,
  state: 'disputed',
  dispute_group: 'inv-1',
  role: null,
  pair_low: 'alice',
  pair_high: 'bob',
  created_event_seq: BigInt(10),
  transaction_id: 'tx-inv',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

function ctx(resolver = 'bob'): OdlEventContext {
  return {
    action: 'dispute_resolve',
    creator: resolver,
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-resolve',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(30),
    eventIdIndexMap: new Map(),
  };
}

function buildHandler(mocks: Partial<OblRepository>) {
  const runInTransaction = jest.fn(async (fn: (trx: unknown) => Promise<void>) => fn({}));
  const resolveDispute = jest.fn();
  const updateLinesStateForInvoice = jest.fn();
  const updateLine = jest.fn();
  const oblNotifications = mockOblNotifications();
  const handler = new DisputeResolveHandler({
    findDispute: jest.fn().mockResolvedValue({
      dispute_id: 'd-1',
      invoice_id: 'inv-1',
      status: 'open',
      disputant: 'bob',
    }),
    findInvoice: jest.fn().mockResolvedValue(invoiceHeader),
    listLinesForInvoice: jest.fn().mockResolvedValue([disputedLine()]),
    findContract: jest.fn(),
    runInTransaction,
    resolveDispute,
    updateLinesStateForInvoice,
    updateLine,
    ...mocks,
  } as unknown as OblRepository,
    oblNotifications.service,
  );
  return {
    handler,
    runInTransaction,
    resolveDispute,
    updateLinesStateForInvoice,
    updateLine,
    oblNotifications,
  };
}

describe('DisputeResolveHandler', () => {
  it('rejects when invoice is not disputed', async () => {
    const { handler, runInTransaction, oblNotifications } = buildHandler({
      listLinesForInvoice: jest
        .fn()
        .mockResolvedValue([disputedLine({ state: 'confirmed' })]),
    });

    await handler.handle(
      { dispute_id: 'd-1', resolver: 'bob', final_amount_usd: '8' },
      ctx(),
    );

    expect(runInTransaction).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });

  it('resolves single line with partial final amount', async () => {
    const { handler, updateLinesStateForInvoice, oblNotifications } = buildHandler({});

    await handler.handle(
      { dispute_id: 'd-1', resolver: 'bob', final_amount_usd: '8' },
      ctx(),
    );

    expect(updateLinesStateForInvoice).toHaveBeenCalledWith(
      'inv-1',
      { state: 'resolved', final_amount_usd: '8.00000000' },
      expect.anything(),
    );
    expect(oblNotifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'obl_dispute_resolve',
        actor: 'bob',
        payload: expect.objectContaining({
          disputeId: 'd-1',
          invoiceId: 'inv-1',
          disputant: 'bob',
          resolver: 'bob',
          amountUsd: '8.00000000',
        }),
      }),
    );
  });

  it('voids all lines on multi invoice when final is zero', async () => {
    const multiHeader: OblInvoice = { ...invoiceHeader, kind: 'multi' };
    const { handler, updateLinesStateForInvoice, updateLine } = buildHandler({
      findInvoice: jest.fn().mockResolvedValue(multiHeader),
      listLinesForInvoice: jest.fn().mockResolvedValue([
        disputedLine({ line_id: 'inv-1:0', amount_usd: '5.00000000' }),
        disputedLine({
          line_id: 'inv-1:1',
          beneficiary: 'referral',
          amount_usd: '1.00000000',
        }),
      ]),
    });

    await handler.handle(
      { dispute_id: 'd-1', resolver: 'bob', final_amount_usd: '0' },
      ctx(),
    );

    expect(updateLinesStateForInvoice).toHaveBeenCalledWith(
      'inv-1',
      { state: 'void', final_amount_usd: '0.00000000' },
      expect.anything(),
    );
    expect(updateLine).not.toHaveBeenCalled();
  });

  it('confirms all lines on multi invoice when final equals total', async () => {
    const multiHeader: OblInvoice = { ...invoiceHeader, kind: 'multi' };
    const lines = [
      disputedLine({ line_id: 'inv-1:0', amount_usd: '5.00000000' }),
      disputedLine({
        line_id: 'inv-1:1',
        beneficiary: 'referral',
        amount_usd: '1.00000000',
      }),
    ];
    const { handler, updateLine, updateLinesStateForInvoice } = buildHandler({
      findInvoice: jest.fn().mockResolvedValue(multiHeader),
      listLinesForInvoice: jest.fn().mockResolvedValue(lines),
    });

    await handler.handle(
      { dispute_id: 'd-1', resolver: 'bob', final_amount_usd: '6' },
      ctx(),
    );

    expect(updateLine).toHaveBeenCalledTimes(2);
    expect(updateLine).toHaveBeenCalledWith(
      'inv-1:0',
      { state: 'resolved', final_amount_usd: '5.00000000' },
      expect.anything(),
    );
    expect(updateLinesStateForInvoice).not.toHaveBeenCalled();
  });

  it('rejects partial resolve on multi invoice', async () => {
    const multiHeader: OblInvoice = { ...invoiceHeader, kind: 'multi' };
    const { handler, runInTransaction, oblNotifications } = buildHandler({
      findInvoice: jest.fn().mockResolvedValue(multiHeader),
      listLinesForInvoice: jest.fn().mockResolvedValue([
        disputedLine({ line_id: 'inv-1:0', amount_usd: '5.00000000' }),
        disputedLine({
          line_id: 'inv-1:1',
          beneficiary: 'referral',
          amount_usd: '1.00000000',
        }),
      ]),
    });

    await handler.handle(
      { dispute_id: 'd-1', resolver: 'bob', final_amount_usd: '3' },
      ctx(),
    );

    expect(runInTransaction).not.toHaveBeenCalled();
    expect(oblNotifications.emit).not.toHaveBeenCalled();
  });
});
