jest.mock('@/modules/object-create/infrastructure/actions/check-object-id.action', () => ({
  checkObjectIdExists: jest.fn(),
}));

jest.mock('../infrastructure/notifications-ws-client', () => {
  const actual = jest.requireActual('../infrastructure/notifications-ws-client');
  return {
    ...actual,
    getNotificationsWsClient: jest.fn(),
    sleepMs: (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }),
  };
});

import type { UserNotificationItem } from '../infrastructure/notifications-ws-client';
import {
  BATCH_IMPORT_COMPLETION_TIMEOUT_MS,
  BATCH_IMPORT_NO_WS_GRACE_MS,
} from '../constants';
import { getNotificationsWsClient } from '../infrastructure/notifications-ws-client';

import { awaitBatchImportByTrx } from './await-batch-import-completion';

const mockGetClient = getNotificationsWsClient as jest.MockedFunction<
  typeof getNotificationsWsClient
>;

type NotificationListener = (item: UserNotificationItem) => void;

function mockWsClient(): {
  listeners: NotificationListener[];
  client: ReturnType<typeof buildMockClient>;
} {
  const listeners: NotificationListener[] = [];
  const client = buildMockClient(listeners);
  mockGetClient.mockReturnValue(client);
  return { listeners, client };
}

function buildMockClient(listeners: NotificationListener[]) {
  return {
    addNotificationListener: jest.fn((handler: NotificationListener) => {
      listeners.push(handler);
      return jest.fn();
    }),
    subscribeTrx: jest.fn().mockResolvedValue(undefined),
    getNotifications: jest.fn(),
    markRead: jest.fn(),
    addReconnectListener: jest.fn(() => jest.fn()),
    close: jest.fn(),
  };
}

function batchCompleted(trxId: string): UserNotificationItem {
  return {
    id: 'n-1',
    type: 'batch_import_completed',
    occurredAt: new Date().toISOString(),
    blockNum: 1,
    trxId,
    objectId: null,
    actor: null,
    payload: {},
  };
}

describe('awaitBatchImportByTrx', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('TC-029: resolves when batch_import_completed arrives for the trx', async () => {
    const { listeners } = mockWsClient();

    const promise = awaitBatchImportByTrx('abc');

    jest.advanceTimersByTime(50);
    listeners[0]?.(batchCompleted('abc'));
    await jest.runAllTimersAsync();

    await expect(promise).resolves.toBeUndefined();
  });

  it('TC-030: keeps waiting when only other transactions complete', async () => {
    mockWsClient();

    const promise = awaitBatchImportByTrx('abc', 5_000);

    jest.advanceTimersByTime(4_999);
    await Promise.resolve();

    let settled = false;
    void promise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    jest.advanceTimersByTime(1);
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
  });

  it('TC-031: waits grace period when notifications WS is unavailable', async () => {
    mockGetClient.mockReturnValue(null);

    const promise = awaitBatchImportByTrx('abc');

    let settled = false;
    void promise.then(() => {
      settled = true;
    });

    jest.advanceTimersByTime(BATCH_IMPORT_NO_WS_GRACE_MS - 1);
    await Promise.resolve();
    expect(settled).toBe(false);

    jest.advanceTimersByTime(1);
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
  });

  it('TC-115: resolves via grace path when trx id is blank', async () => {
    mockGetClient.mockReturnValue(null);

    const promise = awaitBatchImportByTrx('');

    jest.advanceTimersByTime(BATCH_IMPORT_NO_WS_GRACE_MS);
    await jest.runAllTimersAsync();

    await expect(promise).resolves.toBeUndefined();
  });

  it('TC-116: resolves at timeout when completion notification never arrives', async () => {
    mockWsClient();

    const promise = awaitBatchImportByTrx('abc', 1_000);

    jest.advanceTimersByTime(999);
    await Promise.resolve();

    let settled = false;
    void promise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    jest.advanceTimersByTime(1);
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
  });

  it('uses default timeout when omitted', async () => {
    mockWsClient();

    const promise = awaitBatchImportByTrx('abc');

    jest.advanceTimersByTime(BATCH_IMPORT_COMPLETION_TIMEOUT_MS);
    await jest.runAllTimersAsync();

    await expect(promise).resolves.toBeUndefined();
  });
});
