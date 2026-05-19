import { TRX_CONFIRMATION_TIMEOUT_MS } from '../constants';
import {
  getNotificationsWsClient,
  sleepMs,
} from '../infrastructure/notifications-ws-client';

/**
 * Waits until notifications reports trx_processed or until timeout.
 * Never throws — callers always proceed to refresh.
 */
export async function awaitTrxConfirmation(trxId: string): Promise<void> {
  const client = getNotificationsWsClient();
  if (!client) {
    await sleepMs(TRX_CONFIRMATION_TIMEOUT_MS);
    return;
  }

  await Promise.race([
    client.subscribeTrx(trxId).catch(() => undefined),
    sleepMs(TRX_CONFIRMATION_TIMEOUT_MS),
  ]);
}
