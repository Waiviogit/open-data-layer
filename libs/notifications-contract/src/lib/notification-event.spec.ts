import {
  NOTIFICATION_EVENT_TYPES,
  type NotificationEvent,
} from './notification-payloads';
import { notificationEventSchema } from './notification-event.schema';

describe('NotificationEvent contract', () => {
  it('accepts a minimal valid trx_processed event', () => {
    const event: NotificationEvent = {
      type: 'trx_processed',
      occurredAt: '2026-04-16T10:00:00.000Z',
      blockNum: 1,
      trxId: 'abc',
      objectId: null,
      actor: null,
      payload: {},
    };
    expect(notificationEventSchema.safeParse(event).success).toBe(true);
  });

  it('includes all event type literals', () => {
    expect(NOTIFICATION_EVENT_TYPES.length).toBeGreaterThan(5);
    expect(NOTIFICATION_EVENT_TYPES).toContain('follow');
    expect(NOTIFICATION_EVENT_TYPES).toContain('transfer_in');
    expect(NOTIFICATION_EVENT_TYPES).toContain('obl_invoice_issue');
    expect(NOTIFICATION_EVENT_TYPES).toContain('obl_contract_sign');
  });

  it('accepts legacy update_vote_cast payload without updateType or authorPermlink', () => {
    const parsed = notificationEventSchema.safeParse({
      type: 'update_vote_cast',
      occurredAt: '2026-04-16T10:00:00.000Z',
      blockNum: 1,
      trxId: 'abc',
      objectId: 'obj-1',
      actor: 'voter',
      payload: {
        updateId: 'upd-1',
        vote: 'for',
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.payload).toEqual({
        updateId: 'upd-1',
        vote: 'for',
        updateType: 'update',
        objectName: null,
        authorPermlink: '',
      });
    }
  });

  it('rejects unknown notification type', () => {
    const parsed = notificationEventSchema.safeParse({
      type: 'activationCampaign',
      occurredAt: '2026-04-16T10:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: null,
      payload: {},
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts enriched vote_like payload', () => {
    const parsed = notificationEventSchema.safeParse({
      type: 'vote_like',
      occurredAt: '2026-04-16T10:00:00.000Z',
      blockNum: 1,
      trxId: 'abc',
      objectId: null,
      actor: 'voter',
      payload: {
        voter: 'voter',
        author: 'author',
        permlink: 'p',
        weight: 10_000,
        title: 'Hello',
        likesCount: 3,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts legacy vote_like payload without title or likesCount', () => {
    const parsed = notificationEventSchema.safeParse({
      type: 'vote_like',
      occurredAt: '2026-04-16T10:00:00.000Z',
      blockNum: 1,
      trxId: 'abc',
      objectId: null,
      actor: 'voter',
      payload: {
        voter: 'voter',
        author: 'author',
        permlink: 'p',
        weight: 10_000,
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === 'vote_like') {
      expect(parsed.data.payload).toEqual({
        voter: 'voter',
        author: 'author',
        permlink: 'p',
        weight: 10_000,
        title: null,
        likesCount: 0,
      });
    }
  });

  it('accepts engine_transfer_out with transfer payload', () => {
    const parsed = notificationEventSchema.safeParse({
      type: 'engine_transfer_out',
      occurredAt: '2026-04-16T10:00:00.000Z',
      blockNum: 1,
      trxId: 'abc',
      objectId: null,
      actor: 'alice',
      payload: {
        from: 'alice',
        to: 'bob',
        amount: '1',
        symbol: 'BEE',
        memo: null,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts engine_swap payload', () => {
    const parsed = notificationEventSchema.safeParse({
      type: 'engine_swap',
      occurredAt: '2026-04-16T10:00:00.000Z',
      blockNum: 1,
      trxId: 'abc',
      objectId: null,
      actor: 'nervi',
      payload: {
        account: 'nervi',
        symbolOut: 'SWAP.HIVE',
        symbolIn: 'DEC',
        symbolOutQuantity: '0.25',
        symbolInQuantity: '148.48',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts obl_invoice_issue payload', () => {
    const parsed = notificationEventSchema.safeParse({
      type: 'obl_invoice_issue',
      occurredAt: '2026-04-16T10:00:00.000Z',
      blockNum: 1,
      trxId: 'abc',
      objectId: null,
      actor: 'alice',
      payload: {
        invoiceId: 'inv-1',
        issuer: 'alice',
        debtor: 'bob',
        beneficiaries: ['alice'],
        amountUsd: '10.00000000',
        contractId: 'c-1',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects engine_swap missing symbolIn', () => {
    const parsed = notificationEventSchema.safeParse({
      type: 'engine_swap',
      occurredAt: '2026-04-16T10:00:00.000Z',
      blockNum: 1,
      trxId: 'abc',
      objectId: null,
      actor: 'nervi',
      payload: {
        account: 'nervi',
        symbolOut: 'SWAP.HIVE',
        symbolOutQuantity: '0.25',
        symbolInQuantity: '148.48',
      },
    });
    expect(parsed.success).toBe(false);
  });
});
