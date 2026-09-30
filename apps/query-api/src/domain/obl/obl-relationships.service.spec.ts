import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { OblRepository } from '../../repositories/obl.repository';
import { OblRelationshipsService } from './obl-relationships.service';

describe('OblRelationshipsService detail getters', () => {
  let service: OblRelationshipsService;
  const findInvoiceById = jest.fn();
  const findDisputeById = jest.fn();
  const findContractWithOffer = jest.fn();
  const listLinesForInvoice = jest.fn();
  const findServiceOrderById = jest.fn();
  const findReportById = jest.fn();

  beforeEach(async () => {
    findInvoiceById.mockReset();
    findDisputeById.mockReset();
    findContractWithOffer.mockReset();
    listLinesForInvoice.mockReset();
    findServiceOrderById.mockReset();
    findReportById.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OblRelationshipsService,
        {
          provide: OblRepository,
          useValue: {
            findInvoiceById,
            findDisputeById,
            findContractWithOffer,
            listLinesForInvoice,
            findServiceOrderById,
            findReportById,
          },
        },
      ],
    }).compile();
    service = module.get(OblRelationshipsService);
  });

  it('getContract returns serialized contract with offer fields and arbiter', async () => {
    findContractWithOffer.mockResolvedValue({
      contract_id: 'c-1',
      offer_id: 'offer-1',
      offer_version: 1,
      provider: 'alice',
      client: 'bob',
      dispute_rule: 'arbiter',
      arbiter: 'judge',
      metadata: {},
      pair_low: 'alice',
      pair_high: 'bob',
      created_event_seq: BigInt(8),
      transaction_id: 'txc',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      offer_name: 'Design sprint',
      offer_description: 'Scoped delivery',
    });

    const result = await service.getContract('c-1');

    expect(result.arbiter).toBe('judge');
    expect(result.offer_name).toBe('Design sprint');
    expect(result.offer_description).toBe('Scoped delivery');
  });

  it('getInvoice returns serialized invoice and contract summary', async () => {
    findInvoiceById.mockResolvedValue({
      invoice_id: 'inv-1',
      contract_id: 'c-1',
      issuer: 'alice',
      debtor: 'bob',
      kind: 'single',
      details: {},
      created_event_seq: BigInt(10),
      transaction_id: 'tx1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });
    listLinesForInvoice.mockResolvedValue([
      {
        line_id: 'inv-1:0',
        invoice_id: 'inv-1',
        debtor: 'bob',
        beneficiary: 'alice',
        amount_usd: '100',
        final_amount_usd: null,
        state: 'confirmed',
        dispute_group: 'inv-1',
        role: null,
        pair_low: 'alice',
        pair_high: 'bob',
        created_event_seq: BigInt(10),
        transaction_id: 'tx1',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    findContractWithOffer.mockResolvedValue({
      contract_id: 'c-1',
      offer_id: 'offer-1',
      offer_version: 1,
      provider: 'alice',
      client: 'bob',
      dispute_rule: 'client',
      arbiter: null,
      metadata: {},
      pair_low: 'alice',
      pair_high: 'bob',
      created_event_seq: BigInt(8),
      transaction_id: 'txc',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      offer_name: 'Design sprint',
      offer_description: null,
    });

    const result = await service.getInvoice('inv-1');

    expect(result.invoice.invoice_id).toBe('inv-1');
    expect(result.contract?.offer_name).toBe('Design sprint');
  });

  it('getInvoice throws when invoice missing', async () => {
    findInvoiceById.mockResolvedValue(null);
    await expect(service.getInvoice('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getDispute returns dispute with linked invoice and contract', async () => {
    findDisputeById.mockResolvedValue({
      dispute_id: 'd-1',
      invoice_id: 'inv-1',
      disputant: 'bob',
      proposed_amount_usd: '80',
      status: 'open',
      final_amount_usd: null,
      resolver: null,
      created_event_seq: BigInt(11),
      resolved_event_seq: null,
      transaction_id: 'txd',
      created_at: new Date('2026-01-02T00:00:00.000Z'),
    });
    findInvoiceById.mockResolvedValue({
      invoice_id: 'inv-1',
      contract_id: 'c-1',
      issuer: 'alice',
      debtor: 'bob',
      kind: 'single',
      details: {},
      created_event_seq: BigInt(10),
      transaction_id: 'tx1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });
    listLinesForInvoice.mockResolvedValue([
      {
        line_id: 'inv-1:0',
        invoice_id: 'inv-1',
        debtor: 'bob',
        beneficiary: 'alice',
        amount_usd: '100',
        final_amount_usd: null,
        state: 'disputed',
        dispute_group: 'inv-1',
        role: null,
        pair_low: 'alice',
        pair_high: 'bob',
        created_event_seq: BigInt(10),
        transaction_id: 'tx1',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    findContractWithOffer.mockResolvedValue(null);

    const result = await service.getDispute('d-1');

    expect(result.dispute.dispute_id).toBe('d-1');
    expect(result.invoice.invoice_id).toBe('inv-1');
    expect(result.contract).toBeNull();
  });

  it('getInvoice includes linked service order and report when present', async () => {
    findInvoiceById.mockResolvedValue({
      invoice_id: 'inv-1',
      contract_id: 'c-1',
      service_order_id: 'so-1',
      report_id: 'r-1',
      issuer: 'alice',
      debtor: 'bob',
      kind: 'single',
      details: {},
      created_event_seq: BigInt(10),
      transaction_id: 'tx1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });
    listLinesForInvoice.mockResolvedValue([]);
    findContractWithOffer.mockResolvedValue(null);
    findServiceOrderById.mockResolvedValue({
      service_order_id: 'so-1',
      contract_id: 'c-1',
      creator: 'alice',
      provider: 'alice',
      client: 'bob',
      details: {},
      status: 'active',
      cancelled_by: null,
      cancelled_at: null,
      cancelled_event_seq: null,
      cancelled_transaction_id: null,
      created_event_seq: BigInt(9),
      transaction_id: 'txso',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });
    findReportById.mockResolvedValue({
      report_id: 'r-1',
      contract_id: 'c-1',
      service_order_id: 'so-1',
      author: 'bob',
      provider: 'alice',
      client: 'bob',
      details: {},
      created_event_seq: BigInt(9),
      transaction_id: 'txr',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.getInvoice('inv-1');

    expect(result.serviceOrder?.service_order_id).toBe('so-1');
    expect(result.report?.report_id).toBe('r-1');
  });

  it('getServiceOrder returns service order and contract', async () => {
    findServiceOrderById.mockResolvedValue({
      service_order_id: 'so-1',
      contract_id: 'c-1',
      creator: 'alice',
      provider: 'alice',
      client: 'bob',
      details: {},
      status: 'active',
      cancelled_by: null,
      cancelled_at: null,
      cancelled_event_seq: null,
      cancelled_transaction_id: null,
      created_event_seq: BigInt(9),
      transaction_id: 'txso',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });
    findContractWithOffer.mockResolvedValue({
      contract_id: 'c-1',
      offer_id: 'offer-1',
      offer_version: 1,
      provider: 'alice',
      client: 'bob',
      dispute_rule: 'client',
      arbiter: null,
      metadata: {},
      pair_low: 'alice',
      pair_high: 'bob',
      created_event_seq: BigInt(8),
      transaction_id: 'txc',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      offer_name: 'Sprint',
      offer_description: null,
    });

    const result = await service.getServiceOrder('so-1');

    expect(result.serviceOrder.service_order_id).toBe('so-1');
    expect(result.contract?.offer_name).toBe('Sprint');
  });

  it('getServiceOrder throws when missing', async () => {
    findServiceOrderById.mockResolvedValue(null);
    await expect(service.getServiceOrder('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getReport returns report with optional service order', async () => {
    findReportById.mockResolvedValue({
      report_id: 'r-1',
      contract_id: 'c-1',
      service_order_id: 'so-1',
      author: 'bob',
      provider: 'alice',
      client: 'bob',
      details: {},
      created_event_seq: BigInt(9),
      transaction_id: 'txr',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });
    findContractWithOffer.mockResolvedValue(null);
    findServiceOrderById.mockResolvedValue({
      service_order_id: 'so-1',
      contract_id: 'c-1',
      creator: 'alice',
      provider: 'alice',
      client: 'bob',
      details: {},
      status: 'active',
      cancelled_by: null,
      cancelled_at: null,
      cancelled_event_seq: null,
      cancelled_transaction_id: null,
      created_event_seq: BigInt(9),
      transaction_id: 'txso',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.getReport('r-1');

    expect(result.report.report_id).toBe('r-1');
    expect(result.serviceOrder?.service_order_id).toBe('so-1');
  });
});
