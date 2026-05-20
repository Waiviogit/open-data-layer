'use client';

import { buildOdlObjectFollowOp } from '@opden-data-layer/hive-broadcast';

import { getWalletFacade } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';

export async function broadcastObjectUnfollow(
  account: string,
  objectId: string,
  odlCustomJsonId: string,
): Promise<string> {
  const op = buildOdlObjectFollowOp({
    id: odlCustomJsonId,
    objectId,
    method: 'unfollow',
    required_posting_auths: [account],
  });
  const { transactionId } = await getWalletFacade().broadcast({ operations: [op] });
  await awaitTrxConfirmation(transactionId);
  return transactionId;
}
