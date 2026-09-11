import type { AnyNotificationEvent } from '@opden-data-layer/notifications-contract';
import { DirectRecipientStrategy, OblRecipientStrategy } from './recipient-strategies';

describe('DirectRecipientStrategy', () => {
  const strategy = new DirectRecipientStrategy();

  it('routes engine_delegate to delegatee', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'engine_delegate',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'wiv01',
      payload: {
        from: 'wiv01',
        to: 'flowmaster',
        amount: '0.001',
        symbol: 'WAIV',
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['flowmaster']);
  });

  it('routes engine_undelegate to actor', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'engine_undelegate',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'wiv01',
      payload: {
        from: 'wiv01',
        to: 'flowmaster',
        amount: '0.002',
        symbol: 'WAIV',
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['wiv01']);
  });

  it('routes engine_transfer_out to sender', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'engine_transfer_out',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'wiv01',
      payload: {
        from: 'wiv01',
        to: 'flowmaster',
        amount: '0.001',
        symbol: 'WAIV',
        memo: null,
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['wiv01']);
  });

  it('drops transfer_out for self-transfer', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'transfer_out',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        from: 'alice',
        to: 'Alice',
        amount: '1.000',
        symbol: 'HIVE',
        memo: null,
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual([]);
  });

  it('drops engine_transfer_out for self-transfer', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'engine_transfer_out',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        from: 'alice',
        to: 'Alice',
        amount: '0.001',
        symbol: 'WAIV',
        memo: null,
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual([]);
  });

  it('routes engine_swap to account', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'engine_swap',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'nervi',
      payload: {
        account: 'nervi',
        symbolOut: 'SWAP.HIVE',
        symbolIn: 'WAIV',
        symbolOutQuantity: '1',
        symbolInQuantity: '2',
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['nervi']);
  });
});

describe('OblRecipientStrategy', () => {
  const strategy = new OblRecipientStrategy();

  it('notifies author and arbiter on offer publish', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'obl_offer_publish',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        offerId: 'offer-1',
        version: 1,
        kind: 'offer',
        name: 'API',
        author: 'alice',
        arbiter: 'carol',
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['alice', 'carol']);
  });

  it('dedupes invoice parties case-insensitively', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'obl_invoice_issue',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        invoiceId: 'inv-1',
        issuer: 'alice',
        debtor: 'Alice',
        beneficiaries: ['alice', 'bob'],
        amountUsd: '10.00000000',
        contractId: null,
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['alice', 'bob']);
  });

  it('includes contract parties on sign', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'obl_contract_sign',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'bob',
      payload: {
        contractId: 'c-1',
        offerId: 'offer-1',
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['bob', 'alice']);
  });

  it('includes actor even when omitted from payload parties', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'obl_offer_retire',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'dave',
      payload: {
        offerId: 'offer-1',
        version: 1,
        kind: 'offer',
        name: 'API',
        author: 'alice',
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['dave', 'alice']);
  });

  it('notifies author only on offer retire', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'obl_offer_retire',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        offerId: 'offer-1',
        version: 2,
        kind: 'offer',
        name: 'API',
        author: 'alice',
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['alice']);
  });

  it('notifies contract parties on service order create', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'obl_service_order_create',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        serviceOrderId: 'so-1',
        contractId: 'c-1',
        creator: 'alice',
        provider: 'alice',
        client: 'bob',
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['alice', 'bob']);
  });

  it('notifies payer and receiver on payment declare', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'obl_payment_declare',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'bob',
      payload: {
        paymentId: 'pay-1',
        payer: 'bob',
        receiver: 'alice',
        amountUsd: '10.00000000',
        state: 'pending',
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['bob', 'alice']);
  });

  it('drops null resolver on dispute open', async () => {
    const recipients = await strategy.resolveRecipients({
      type: 'obl_dispute_open',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'bob',
      payload: {
        disputeId: 'd-1',
        invoiceId: 'inv-1',
        disputant: 'bob',
        resolver: null,
        debtor: 'bob',
        beneficiaries: ['alice'],
        amountUsd: '7.00000000',
      },
    } as AnyNotificationEvent);
    expect(recipients).toEqual(['bob', 'alice']);
  });
});
