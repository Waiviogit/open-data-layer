import { checkObjectIdExists } from '@/modules/object-create/infrastructure/actions/check-object-id.action';

import {
  BATCH_IMPORT_COMPLETION_TIMEOUT_MS,
  BATCH_IMPORT_NO_WS_GRACE_MS,
} from '../constants';
import {
  getNotificationsWsClient,
  sleepMs,
  type NotificationsWsClient,
} from '../infrastructure/notifications-ws-client';

const OBJECT_INDEX_POLL_INTERVAL_MS = 2_000;

function waitForBatchImportWs(
  client: NotificationsWsClient,
  trxId: string,
  deadline: number,
): Promise<void> {
  const normalizedTrx = trxId.trim();
  if (!normalizedTrx) {
    return Promise.resolve();
  }

  const remaining = Math.max(0, deadline - Date.now());
  if (remaining === 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      unsub();
      clearTimeout(timer);
      resolve();
    };

    const unsub = client.addNotificationListener((item) => {
      if (
        item.type === 'batch_import_completed' &&
        item.trxId === normalizedTrx
      ) {
        finish();
      }
    });

    const timer = setTimeout(finish, remaining);
  });
}

/** Polls query-api until the object exists or timeout. Never throws. */
export async function awaitObjectIndexed(
  objectId: string,
  timeoutMs = BATCH_IMPORT_COMPLETION_TIMEOUT_MS,
): Promise<void> {
  const normalizedObjectId = objectId.trim();
  if (!normalizedObjectId) {
    await sleepMs(timeoutMs);
    return;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const exists = await checkObjectIdExists(normalizedObjectId);
    if (exists === true) {
      return;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return;
    }
    await sleepMs(Math.min(OBJECT_INDEX_POLL_INTERVAL_MS, remaining));
  }
}

/**
 * Waits until batch_import is processed: WS `batch_import_completed` for trxId
 * and/or object appears in query-api. Never throws.
 */
export async function awaitBatchImportCompletion(
  trxId: string,
  objectId: string,
  timeoutMs = BATCH_IMPORT_COMPLETION_TIMEOUT_MS,
): Promise<void> {
  const normalizedTrx = trxId.trim();
  const normalizedObjectId = objectId.trim();
  if (!normalizedObjectId) {
    await sleepMs(timeoutMs);
    return;
  }

  const deadline = Date.now() + timeoutMs;

  const client = getNotificationsWsClient();
  if (!client || !normalizedTrx) {
    await sleepMs(Math.min(BATCH_IMPORT_NO_WS_GRACE_MS, timeoutMs));
    return;
  }

  await Promise.race([
    waitForBatchImportWs(client, normalizedTrx, deadline),
    awaitObjectIndexed(normalizedObjectId, timeoutMs),
  ]);
}

/** Waits for WS `batch_import_completed` for trxId. Never throws. */
export async function awaitBatchImportByTrx(
  trxId: string,
  timeoutMs = BATCH_IMPORT_COMPLETION_TIMEOUT_MS,
): Promise<void> {
  const normalizedTrx = trxId.trim();
  if (!normalizedTrx) {
    await sleepMs(Math.min(BATCH_IMPORT_NO_WS_GRACE_MS, timeoutMs));
    return;
  }

  const client = getNotificationsWsClient();
  if (!client) {
    await sleepMs(Math.min(BATCH_IMPORT_NO_WS_GRACE_MS, timeoutMs));
    return;
  }

  await waitForBatchImportWs(client, normalizedTrx, Date.now() + timeoutMs);
}
