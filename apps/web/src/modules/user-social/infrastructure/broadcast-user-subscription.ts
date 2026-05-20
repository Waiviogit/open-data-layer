'use client';

import {
  buildHiveFollowOp,
  buildHiveUnfollowOp,
  buildOdlUserFollowBellOp,
} from '@opden-data-layer/hive-broadcast';

import { getWalletFacade } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';

export async function broadcastUserFollowToggle(
  follower: string,
  following: string,
  currentlyFollowing: boolean,
): Promise<string> {
  const op = currentlyFollowing
    ? buildHiveUnfollowOp(follower, following)
    : buildHiveFollowOp(follower, following);
  const { transactionId } = await getWalletFacade().broadcast({ operations: [op] });
  await awaitTrxConfirmation(transactionId);
  return transactionId;
}

export async function broadcastUserFollowBell(
  follower: string,
  following: string,
  bell: boolean,
  odlCustomJsonId: string,
): Promise<string> {
  const op = buildOdlUserFollowBellOp({
    id: odlCustomJsonId,
    following,
    bell,
    required_posting_auths: [follower],
  });
  const { transactionId } = await getWalletFacade().broadcast({ operations: [op] });
  await awaitTrxConfirmation(transactionId);
  return transactionId;
}
