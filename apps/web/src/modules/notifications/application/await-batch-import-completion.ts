import { checkObjectIdExists } from '@/modules/object-create/infrastructure/actions/check-object-id.action';

import { BATCH_IMPORT_COMPLETION_TIMEOUT_MS } from '../constants';
import {
  getNotificationsWsClient,
  sleepMs,
} from '../infrastructure/notifications-ws-client';

const OBJECT_INDEX_POLL_INTERVAL_MS = 2_000;

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

  const waitForWsNotification = (): Promise<void> => {
    const client = getNotificationsWsClient();
    if (!client || !normalizedTrx) {
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
  };

  const waitForObjectIndexed = async (): Promise<void> => {
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
  };

  await Promise.race([waitForWsNotification(), waitForObjectIndexed()]);
}
