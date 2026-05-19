import type { NotificationEvent, NotificationEventType } from './notification-event';

const EVENT_TYPES: NotificationEventType[] = [
  'update_vote_cast',
  'object_created',
  'follow',
  'trx_processed',
];

describe('NotificationEvent contract', () => {
  it('accepts a minimal valid event shape', () => {
    const event: NotificationEvent = {
      type: 'trx_processed',
      occurredAt: '2026-04-16T10:00:00.000Z',
      blockNum: 1,
      trxId: 'abc',
      objectId: null,
      actor: null,
      payload: {},
    };
    expect(event.type).toBe('trx_processed');
  });

  it('includes all planned event type literals', () => {
    expect(EVENT_TYPES).toEqual([
      'update_vote_cast',
      'object_created',
      'follow',
      'trx_processed',
    ]);
  });
});
