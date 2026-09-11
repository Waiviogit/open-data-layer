import {
  NOTIFICATION_EVENT_TYPES,
  type AnyNotificationEvent,
} from '@opden-data-layer/notifications-contract';
import { minimalNotificationEventPayload } from '../testing/minimal-payloads';
import { buildNotificationMessage } from './registry';

const baseEnvelope = {
  occurredAt: '2026-01-01T00:00:00.000Z',
  blockNum: 1,
  trxId: 'trx',
  objectId: null,
  actor: 'alice',
};

describe('buildNotificationMessage', () => {
  it('builds follow message', () => {
    const msg = buildNotificationMessage({
      ...baseEnvelope,
      type: 'follow',
      payload: { following: 'bob', action: 'follow' },
    });
    expect(msg.key).toBe('notification_following_username');
    expect(msg.params['username']).toBe('alice');
  });

  it('builds transfer_in message', () => {
    const msg = buildNotificationMessage({
      ...baseEnvelope,
      type: 'transfer_in',
      actor: 'sender',
      payload: {
        from: 'sender',
        to: 'bob',
        amount: '1.000',
        symbol: 'HIVE',
        memo: null,
      },
    });
    expect(msg.key).toBe('notification_transfer_username_amount');
    expect(msg.href).toContain('/transfers');
  });

  it('builds update_vote_cast message with update detail href', () => {
    const msg = buildNotificationMessage({
      ...baseEnvelope,
      type: 'update_vote_cast',
      objectId: 'obj-1',
      actor: 'voter',
      payload: {
        updateId: 'upd-1',
        vote: 'for',
        updateType: 'name',
        objectName: 'Shop',
        authorPermlink: 'obj-1',
      },
    });
    expect(msg.key).toBe('notification_update_vote_cast');
    expect(msg.href).toBe('/object/obj-1/updates/upd-1');
    expect(msg.paramHrefs?.['objectName']).toBe('/object/obj-1/updates/upd-1');
    expect(msg.icon).toBe('object');
  });

  it('builds obl_contract_sign message', () => {
    const msg = buildNotificationMessage({
      ...baseEnvelope,
      type: 'obl_contract_sign',
      actor: 'bob',
      payload: {
        contractId: 'c-1',
        offerId: 'offer-1',
        provider: 'alice',
        client: 'bob',
        signer: 'bob',
      },
    });
    expect(msg.key).toBe('notification_obl_contract_sign');
    expect(msg.href).toBe('/business/contracts/c-1');
    expect(msg.params['signer']).toBe('bob');
  });

  it.each([
    {
      type: 'obl_offer_publish' as const,
      actor: 'alice',
      payload: {
        offerId: 'offer-1',
        version: 2,
        kind: 'offer' as const,
        name: 'API',
        author: 'alice',
        arbiter: 'carol',
      },
      href: '/offers/offer-1/versions/2',
    },
    {
      type: 'obl_offer_update' as const,
      actor: 'alice',
      payload: {
        offerId: 'req-1',
        version: 3,
        kind: 'request' as const,
        name: 'Help',
        author: 'alice',
        arbiter: null,
      },
      href: '/requests/req-1/versions/3',
    },
    {
      type: 'obl_invoice_issue' as const,
      actor: 'alice',
      payload: {
        invoiceId: 'inv-1',
        issuer: 'alice',
        debtor: 'bob',
        beneficiaries: ['alice'],
        amountUsd: '10.00000000',
        contractId: null,
      },
      href: '/business/invoices/inv-1',
    },
    {
      type: 'obl_payment_declare' as const,
      actor: 'bob',
      payload: {
        paymentId: 'pay-1',
        payer: 'bob',
        receiver: 'alice',
        amountUsd: '10.00000000',
        state: 'pending' as const,
      },
      href: '/business/relationships/alice',
    },
    {
      type: 'obl_dispute_open' as const,
      actor: 'bob',
      payload: {
        disputeId: 'd-1',
        invoiceId: 'inv-1',
        disputant: 'bob',
        resolver: 'carol',
        debtor: 'bob',
        beneficiaries: ['alice'],
        amountUsd: '7.00000000',
      },
      href: '/business/disputes/d-1',
    },
  ])('builds $type href', ({ type, actor, payload, href }) => {
    const msg = buildNotificationMessage({
      ...baseEnvelope,
      type,
      actor,
      payload,
    } as AnyNotificationEvent);
    expect(msg.href).toBe(href);
  });

  it('builds update_vote_cast with fallback update type when updateType is missing', () => {
    const msg = buildNotificationMessage({
      ...baseEnvelope,
      type: 'update_vote_cast',
      objectId: 'obj-1',
      actor: 'voter',
      payload: {
        updateId: 'upd-1',
        vote: 'for',
        updateType: 'name',
        objectName: 'Shop',
        authorPermlink: 'obj-1',
      },
    });
    const legacy = buildNotificationMessage({
      ...baseEnvelope,
      type: 'update_vote_cast',
      objectId: 'obj-1',
      actor: 'voter',
      payload: {
        updateId: 'upd-1',
        vote: 'for',
        updateType: '',
        objectName: null,
        authorPermlink: 'obj-1',
      },
    });
    expect(legacy.params['update']).toBe('update');
    expect(msg.params['update']).toBe('name');
  });

  it('returns generic for unknown handling gaps', () => {
    const msg = buildNotificationMessage({
      ...baseEnvelope,
      type: 'trx_processed',
      actor: null,
      payload: {},
    });
    expect(msg.key).toBe('notification_generic_default_message');
  });

  it('covers every declared event type without throwing', () => {
    for (const type of NOTIFICATION_EVENT_TYPES) {
      const event = {
        ...baseEnvelope,
        type,
        payload: minimalNotificationEventPayload(type),
      } as Parameters<typeof buildNotificationMessage>[0];
      expect(() => buildNotificationMessage(event)).not.toThrow();
    }
  });
});

