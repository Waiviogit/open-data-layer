import {
  applyNotificationParams,
  formatNotification,
  notificationIconType,
} from './format-notification';
import type { UserNotificationItem } from '../infrastructure/notifications-ws-client';

function item(overrides: Partial<UserNotificationItem> = {}): UserNotificationItem {
  return {
    id: 'n1',
    type: 'follow',
    occurredAt: '2026-05-19T10:00:00.000Z',
    blockNum: 1,
    trxId: null,
    objectId: null,
    actor: 'alice',
    payload: {},
    ...overrides,
  };
}

describe('formatNotification', () => {
  it('maps follow → notification_following_username with actor param', () => {
    const result = formatNotification(item({ type: 'follow', actor: 'alice' }));
    expect(result.key).toBe('notification_following_username');
    expect(result.params).toEqual({ username: 'alice' });
  });

  it('maps update_vote_cast → notification_upvoted_username_post', () => {
    const result = formatNotification(
      item({ type: 'update_vote_cast', actor: 'bob' }),
    );
    expect(result.key).toBe('notification_upvoted_username_post');
    expect(result.params).toEqual({ username: 'bob' });
  });

  it('falls back to notification_generic_default_message for unknown types', () => {
    const result = formatNotification(item({ type: 'object_created' }));
    expect(result.key).toBe('notification_generic_default_message');
    expect(result.params).toBeUndefined();
  });

  it('uses ? when actor is missing', () => {
    const result = formatNotification(item({ type: 'follow', actor: null }));
    expect(result.params).toEqual({ username: '?' });
  });
});

describe('notificationIconType', () => {
  it.each([
    ['follow', 'follow'],
    ['update_vote_cast', 'vote'],
    ['object_created', 'generic'],
  ] as const)('type %s → icon %s', (type, expected) => {
    expect(notificationIconType(item({ type }))).toBe(expected);
  });
});

describe('applyNotificationParams', () => {
  it('substitutes placeholders in template', () => {
    expect(
      applyNotificationParams('{username} started following you', {
        username: 'alice',
      }),
    ).toBe('alice started following you');
  });

  it('returns template unchanged when params omitted', () => {
    expect(applyNotificationParams('You have a new notification')).toBe(
      'You have a new notification',
    );
  });
});
