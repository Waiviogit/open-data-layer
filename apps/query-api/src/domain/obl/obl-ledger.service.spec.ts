import { BadRequestException } from '@nestjs/common';
import type { OblInvoiceLineView } from './obl-invoice-line';
import { OblPayment } from '@opden-data-layer/odl-db-types';

import { OblLedgerService } from './obl-ledger.service';
import type { OblRepository } from '../../repositories/obl.repository';

function invoiceLine(
  id: string,
  seq: bigint,
  state: OblInvoiceLineView['state'] = 'confirmed',
): OblInvoiceLineView {
  return {
    invoice_id: id,
    contract_id: null,
    service_order_id: null,
    report_id: null,
    issuer: 'alice',
    debtor: 'bob',
    kind: 'single',
    details: {},
    created_event_seq: seq,
    transaction_id: 'tx',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    line_id: `${id}:0`,
    creditor: 'alice',
    beneficiary: 'alice',
    amount_usd: '100.00000000',
    final_amount_usd: null,
    state,
    role: null,
    dispute_group: id,
    pair_low: 'alice',
    pair_high: 'bob',
  };
}

function payment(id: string, seq: bigint): OblPayment {
  return {
    payment_id: id,
    payer: 'bob',
    receiver: 'alice',
    amount_usd: '100.00000000',
    declared_amount_usd: '100.00000000',
    method: 'offchain',
    token_symbol: null,
    token_amount: null,
    rate_usd: null,
    state: 'confirmed',
    ref: null,
    pair_low: 'alice',
    pair_high: 'bob',
    created_event_seq: seq,
    transaction_id: 'tx',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('OblLedgerService', () => {
  it('filters invoices and payments by ledger started_event_seq', async () => {
    const startedSeq = BigInt(50);
    const obl = {
      findLedgerStartedSeq: jest.fn().mockResolvedValue(startedSeq),
      listContractsForPairWithOffer: jest.fn().mockResolvedValue([]),
      listInvoicesForPair: jest.fn().mockResolvedValue([
        invoiceLine('pre', BigInt(10)),
        invoiceLine('post', BigInt(60)),
      ]),
      listPaymentsForPair: jest.fn().mockResolvedValue([
        payment('pay-pre', BigInt(20)),
        payment('pay-post', BigInt(70)),
      ]),
      listDisputesForInvoices: jest.fn().mockResolvedValue([]),
    } as unknown as OblRepository;

    const service = new OblLedgerService(obl);
    const result = await service.getLedger('alice', 'bob');

    expect(result.startedEventSeq).toBe('50');
    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].invoice_id).toBe('post');
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].payment_id).toBe('pay-post');
  });

  it('filters contracts by ledger started_event_seq', async () => {
    const startedSeq = BigInt(50);
    const obl = {
      findLedgerStartedSeq: jest.fn().mockResolvedValue(startedSeq),
      listContractsForPairWithOffer: jest.fn().mockResolvedValue([
        {
          contract_id: 'pre',
          created_event_seq: BigInt(10),
          offer_name: 'Old',
          offer_description: null,
          offer_status: 'retired',
        },
        {
          contract_id: 'post',
          created_event_seq: BigInt(60),
          offer_name: 'New',
          offer_description: null,
          offer_status: 'active',
        },
      ]),
      listInvoicesForPair: jest.fn().mockResolvedValue([]),
      listPaymentsForPair: jest.fn().mockResolvedValue([]),
      listDisputesForInvoices: jest.fn().mockResolvedValue([]),
    } as unknown as OblRepository;

    const service = new OblLedgerService(obl);
    const result = await service.getLedger('alice', 'bob');

    expect(result.contracts).toHaveLength(1);
    expect(result.contracts[0].contract_id).toBe('post');
  });

  it('rejects identical accounts', async () => {
    const service = new OblLedgerService({} as OblRepository);
    await expect(service.getLedger('alice', 'alice')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
