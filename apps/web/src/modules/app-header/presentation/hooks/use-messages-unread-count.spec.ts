/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';

import { useMessagesUnreadCount } from './use-messages-unread-count';

const addNotificationListener = jest.fn();
const getNotificationsWsClient = jest.fn();

jest.mock('@/modules/notifications/infrastructure/notifications-ws-client', () => ({
  getNotificationsWsClient: (...args: unknown[]) => getNotificationsWsClient(...args),
}));

describe('useMessagesUnreadCount', () => {
  beforeEach(() => {
    addNotificationListener.mockReset();
    getNotificationsWsClient.mockReset();
    getNotificationsWsClient.mockReturnValue({
      addNotificationListener,
    });
    addNotificationListener.mockImplementation(() => () => undefined);
  });

  it('seeds from the SSR count and follows prop updates', () => {
    const { result, rerender } = renderHook(
      ({ initial }) => useMessagesUnreadCount('alice', initial),
      { initialProps: { initial: 2 } },
    );
    expect(result.current).toBe(2);

    rerender({ initial: 0 });
    expect(result.current).toBe(0);
  });

  it('increments on inbox message notifications only', () => {
    let handler: ((item: { type: string }) => void) | undefined;
    addNotificationListener.mockImplementation((next) => {
      handler = next;
      return () => undefined;
    });

    const { result } = renderHook(() => useMessagesUnreadCount('alice', 1));

    act(() => {
      handler?.({ type: 'message_direct' });
      handler?.({ type: 'message_group' });
      handler?.({ type: 'bell_object_message' });
    });

    expect(result.current).toBe(3);
  });
});
