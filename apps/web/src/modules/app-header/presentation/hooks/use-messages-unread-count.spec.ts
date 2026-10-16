/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';

import { refreshMessagesUnreadCountAction } from '@/modules/user-profile/infrastructure/feed-unread.actions';

import { useMessagesUnreadCount } from './use-messages-unread-count';

const addNotificationListener = jest.fn();
const getNotificationsWsClient = jest.fn();

jest.mock('@/modules/notifications/infrastructure/notifications-ws-client', () => ({
  getNotificationsWsClient: (...args: unknown[]) => getNotificationsWsClient(...args),
}));

jest.mock('@/modules/user-profile/infrastructure/feed-unread.actions', () => ({
  refreshMessagesUnreadCountAction: jest.fn(),
}));

describe('useMessagesUnreadCount', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    addNotificationListener.mockReset();
    getNotificationsWsClient.mockReset();
    getNotificationsWsClient.mockReturnValue({
      addNotificationListener,
    });
    addNotificationListener.mockImplementation(() => () => undefined);
    (refreshMessagesUnreadCountAction as jest.Mock).mockReset();
    (refreshMessagesUnreadCountAction as jest.Mock).mockResolvedValue(4);
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('refetches inbox unread after message notifications and ignores other types', async () => {
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

    expect(refreshMessagesUnreadCountAction).not.toHaveBeenCalled();
    expect(result.current).toBe(1);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(refreshMessagesUnreadCountAction).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(4);
  });
});
