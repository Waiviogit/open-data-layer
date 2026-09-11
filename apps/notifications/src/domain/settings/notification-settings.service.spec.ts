import type { AnyNotificationEvent } from '@opden-data-layer/notifications-contract';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import { NotificationSettingsService } from './notification-settings.service';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettingsView,
} from '../../constants/notification-settings.constants';

function baseSettings(
  overrides: Partial<NotificationSettingsView> = {},
): NotificationSettingsView {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    my_post: true,
    my_comment: true,
    my_like: true,
    downvote: true,
    claim_reward: true,
    ...overrides,
  };
}

const voteLike = {
  type: 'vote_like',
  occurredAt: '2026-01-01T00:00:00.000Z',
  blockNum: 1,
  trxId: null,
  objectId: null,
  actor: 'v',
  payload: {
    voter: 'v',
    author: 'a',
    permlink: 'p',
    weight: 1,
    title: null,
    likesCount: 0,
  },
} as AnyNotificationEvent;

describe('NotificationSettingsService', () => {
  const service = new NotificationSettingsService();

  it('blocks vote_downvote when downvote setting is false', () => {
    const settings = baseSettings({ downvote: false });
    const event = {
      type: 'vote_downvote',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'v',
      payload: { voter: 'v', author: 'a', permlink: 'p', weight: 1 },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(false);
  });

  it('applies minimal_transfer to engine_transfer inbound amounts', () => {
    const settings = baseSettings({ minimal_transfer: 10 });
    const event = {
      type: 'engine_transfer',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'from',
      payload: {
        from: 'from',
        to: 'bob',
        amount: '1',
        symbol: 'HIVE',
        memo: null,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, { hive: 0.5, hbd: 1 })).toBe(
      false,
    );
  });

  it('allows transfers when USD rates are unavailable', () => {
    const settings = baseSettings({ minimal_transfer: 10 });
    const event = {
      type: 'transfer_in',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'from',
      payload: {
        from: 'from',
        to: 'bob',
        amount: '1',
        symbol: 'HIVE',
        memo: null,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(true);
  });

  it('blocks engine_transfer_out when transfer setting is false', () => {
    const settings = baseSettings({ transfer: false });
    const event = {
      type: 'engine_transfer_out',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        from: 'alice',
        to: 'bob',
        amount: '1',
        symbol: 'WAIV',
        memo: null,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(false);
  });

  it('blocks engine_swap when fill_order setting is false', () => {
    const settings = baseSettings({ fill_order: false });
    const event = {
      type: 'engine_swap',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'nervi',
      payload: {
        account: 'nervi',
        symbolOut: 'SWAP.HIVE',
        symbolIn: 'DEC',
        symbolOutQuantity: '0.25',
        symbolInQuantity: '148.48',
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(false);
  });

  it('allows engine_swap when transfer setting is false', () => {
    const settings = baseSettings({ transfer: false, fill_order: true });
    const event = {
      type: 'engine_swap',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'nervi',
      payload: {
        account: 'nervi',
        symbolOut: 'SWAP.HIVE',
        symbolIn: 'DEC',
        symbolOutQuantity: '0.25',
        symbolInQuantity: '148.48',
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(true);
  });

  it('does not apply minimal_transfer to engine_transfer_out', () => {
    const settings = baseSettings({ minimal_transfer: 10 });
    const event = {
      type: 'engine_transfer_out',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        from: 'alice',
        to: 'bob',
        amount: '1',
        symbol: 'HIVE',
        memo: null,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, { hive: 0.5, hbd: 1 })).toBe(
      true,
    );
  });

  it('passes minimal_transfer for non-HIVE/HBD engine_transfer symbols', () => {
    const settings = baseSettings({ minimal_transfer: 10 });
    const event = {
      type: 'engine_transfer',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'from',
      payload: {
        from: 'from',
        to: 'bob',
        amount: '1',
        symbol: 'BEE',
        memo: null,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, { hive: 0.5, hbd: 1 })).toBe(
      true,
    );
  });

  it('blocks bell_thread when followed_user_threads is false', () => {
    const settings = baseSettings({ followed_user_threads: false });
    const event = {
      type: 'bell_thread',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'bob',
      payload: { author: 'bob', permlink: 'p' },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(false);
  });

  it('blocks object_update when claimed_object_updates is false', () => {
    const settings = baseSettings({ claimed_object_updates: false });
    const event = {
      type: 'object_update',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: 'obj-1',
      actor: 'bob',
      payload: {
        updateId: 'u1',
        updateType: 'name',
        objectName: null,
        authorPermlink: null,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(false);
  });

  it('blocks product group id updates when group_id_control is false', () => {
    const settings = baseSettings({ group_id_control: false });
    const event = {
      type: 'object_update',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: 'obj-1',
      actor: 'bob',
      payload: {
        updateId: 'u1',
        updateType: UPDATE_TYPES.PRODUCT_GROUP_ID,
        objectName: null,
        authorPermlink: null,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(false);
  });

  it('allows non-group object_update when group_id_control is false', () => {
    const settings = baseSettings({ group_id_control: false });
    const event = {
      type: 'object_update',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: 'obj-1',
      actor: 'bob',
      payload: {
        updateId: 'u1',
        updateType: 'name',
        objectName: null,
        authorPermlink: null,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(true);
  });

  it('allows votes under default settings', () => {
    expect(
      service.isAllowed(DEFAULT_NOTIFICATION_SETTINGS, voteLike, null),
    ).toBe(true);
  });

  it('needsUsdRates only for minimal-transfer gated types', () => {
    expect(service.needsUsdRates([voteLike])).toBe(false);
    expect(
      service.needsUsdRates([
        voteLike,
        {
          type: 'transfer_in',
          occurredAt: '2026-01-01T00:00:00.000Z',
          blockNum: 1,
          trxId: null,
          objectId: null,
          actor: 'from',
          payload: {
            from: 'from',
            to: 'bob',
            amount: '1',
            symbol: 'HIVE',
            memo: null,
          },
        } as AnyNotificationEvent,
      ]),
    ).toBe(true);
  });

  it('blocks message_direct and message_group when messages setting is false', () => {
    const settings = baseSettings({ messages: false });
    const direct = {
      type: 'message_direct',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        channelId: 'dm-1',
        messageId: 'msg-1',
        author: 'alice',
        encrypted: false,
      },
    } as AnyNotificationEvent;
    const group = {
      type: 'message_group',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        channelId: 'grp-1',
        messageId: 'msg-2',
        author: 'alice',
        channelTitle: 'Team',
        encrypted: false,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, direct, null)).toBe(false);
    expect(service.isAllowed(settings, group, null)).toBe(false);
  });

  it('allows bell_object_message when messages setting is false', () => {
    const settings = baseSettings({ messages: false });
    const event = {
      type: 'bell_object_message',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: 'obj-1',
      actor: 'alice',
      payload: {
        channelId: 'obj-ch-1',
        messageId: 'msg-3',
        author: 'alice',
        encrypted: false,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(true);
  });

  it('blocks obl_invoice_issue when obl setting is false', () => {
    const settings = baseSettings({ obl: false });
    const event = {
      type: 'obl_invoice_issue',
      occurredAt: '2026-01-01T00:00:00.000Z',
      blockNum: 1,
      trxId: null,
      objectId: null,
      actor: 'alice',
      payload: {
        invoiceId: 'inv-1',
        issuer: 'alice',
        debtor: 'bob',
        beneficiaries: ['alice'],
        amountUsd: '10.00000000',
        contractId: null,
      },
    } as AnyNotificationEvent;

    expect(service.isAllowed(settings, event, null)).toBe(false);
  });
});
