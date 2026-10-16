import {
  configureNotificationsWsUrl,
  createNotificationsWsClient,
  getNotificationsWsClient,
  resetNotificationsWsSingletonForTests,
} from './notifications-ws-client';

type MockWsInstance = {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  readyState: number;
  close: jest.Mock;
};

const OPEN = 1;
const CLOSED = 3;

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
}

describe('NotificationsWsClientImpl reconnect', () => {
  let instances: MockWsInstance[];
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    instances = [];
    originalWebSocket = global.WebSocket;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'test-token' }),
    }) as typeof fetch;

    class MockWebSocket {
      static readonly OPEN = OPEN;
      static readonly CLOSED = CLOSED;
      onopen: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((ev: { data: string }) => void) | null = null;
      readyState = 0;
      send = jest.fn((payload: string) => {
        let parsed: { event?: string; data?: { correlationId?: string } };
        try {
          parsed = JSON.parse(payload) as {
            event?: string;
            data?: { correlationId?: string };
          };
        } catch {
          return;
        }
        if (
          parsed.event === 'get_notifications' &&
          parsed.data?.correlationId
        ) {
          const correlationId = parsed.data.correlationId;
          queueMicrotask(() => {
            this.onmessage?.({
              data: JSON.stringify({
                event: 'get_notifications',
                data: {
                  correlationId,
                  status: 'ok',
                  items: [],
                  lastReadTimestamp: null,
                },
              }),
            });
          });
        }
      });
      close = jest.fn(() => {
        this.readyState = CLOSED;
        this.onclose?.();
      });

      constructor(public url: string) {
        instances.push(this as unknown as MockWsInstance);
        queueMicrotask(() => {
          this.readyState = OPEN;
          this.onopen?.();
        });
      }
    }

    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.WebSocket = originalWebSocket;
  });

  it('schedules reconnect after an unexpected socket close', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const client = createNotificationsWsClient('ws://localhost:7200/notifications/ws');
    client.addNotificationListener(() => {});

    await flushMicrotasks();
    expect(instances).toHaveLength(1);

    instances[0]?.close();
    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
    client.close();
  });

  it('notifies reconnect listeners when connection is re-established', async () => {
    jest.useRealTimers();
    const client = createNotificationsWsClient('ws://localhost:7200/notifications/ws');
    const onReconnect = jest.fn();
    client.addReconnectListener(onReconnect);
    client.addNotificationListener(() => {});

    await flushMicrotasks();
    expect(instances).toHaveLength(1);

    instances[0]?.close();
    await flushMicrotasks();

    await client.getNotifications();
    await flushMicrotasks();

    expect(instances.length).toBe(2);
    expect(onReconnect).toHaveBeenCalledTimes(1);
    client.close();
  });

  it('shares one socket and one token fetch across overlapping ensureConnected', async () => {
    const client = createNotificationsWsClient('ws://localhost:7200/notifications/ws');
    client.addNotificationListener(() => {});
    client.addNotificationListener(() => {});

    await flushMicrotasks();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(instances).toHaveLength(1);
    client.close();
  });

  it('ignores onclose from a replaced socket', async () => {
    const client = createNotificationsWsClient('ws://localhost:7200/notifications/ws');
    client.addNotificationListener(() => {});
    await flushMicrotasks();
    const first = instances[0];
    expect(first).toBeDefined();

    first?.close();
    await flushMicrotasks();
    await jest.runOnlyPendingTimersAsync();
    await flushMicrotasks();
    expect(instances.length).toBeGreaterThanOrEqual(2);

    const afterReconnect = instances.length;
    first?.onclose?.();
    await flushMicrotasks();
    expect(instances.length).toBe(afterReconnect);
    client.close();
  });
});

describe('configureNotificationsWsUrl', () => {
  afterEach(() => {
    resetNotificationsWsSingletonForTests();
  });

  it('does not close the live singleton when the URL is unchanged', () => {
    configureNotificationsWsUrl('ws://localhost:7200/notifications/ws');
    const client = getNotificationsWsClient();
    expect(client).not.toBeNull();
    const close = jest.spyOn(client!, 'close');
    configureNotificationsWsUrl('ws://localhost:7200/notifications/ws');
    configureNotificationsWsUrl('ws://localhost:7200/notifications/ws');
    expect(close).not.toHaveBeenCalled();
    close.mockRestore();
  });
});

