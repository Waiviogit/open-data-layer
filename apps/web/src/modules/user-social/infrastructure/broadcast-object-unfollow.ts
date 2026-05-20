'use client';

import { buildOdlObjectFollowOp } from '@opden-data-layer/hive-broadcast';

import { ODL_CUSTOM_JSON_ID } from '@/config/odl-network-public';
import { getWalletFacade } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';

export async function broadcastObjectUnfollow(
  account: string,
  objectId: string,
): Promise<string> {
  const op = buildOdlObjectFollowOp({
    id: ODL_CUSTOM_JSON_ID,
    objectId,
    method: 'unfollow',
    required_posting_auths: [account],
  });
  const { transactionId } = await getWalletFacade().broadcast({ operations: [op] });
  await awaitTrxConfirmation(transactionId);
  return transactionId;
}
