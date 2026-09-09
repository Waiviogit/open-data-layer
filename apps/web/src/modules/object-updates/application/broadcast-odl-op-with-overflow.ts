import {
  buildOdlBatchImportOp,
  exceedsHiveCustomJsonLimit,
  type CustomJsonOp,
} from '@opden-data-layer/hive-broadcast';

import { getWalletFacade } from '@/modules/auth';
import { uploadOdlToIpfs } from '@/modules/object-create/infrastructure/actions/upload-odl-to-ipfs.action';
import {
  awaitBatchImportByTrx,
  awaitTrxConfirmation,
} from '@/modules/notifications';

export type BroadcastOdlOverflowError =
  | 'unauthorized'
  | 'upload_failed'
  | 'broadcast_failed';

export type BroadcastOdlOpWithOverflowInput = {
  op: CustomJsonOp;
  account: string;
  odlCustomJsonId: string;
  objectId: string;
};

export type BroadcastOdlOpWithOverflowResult =
  | { success: true; transactionId: string; usedIpfsBatch: boolean }
  | { success: false; error: BroadcastOdlOverflowError };

export async function broadcastOdlOpWithOverflow(
  input: BroadcastOdlOpWithOverflowInput,
): Promise<BroadcastOdlOpWithOverflowResult> {
  let opToBroadcast = input.op;
  let usedIpfsBatch = false;

  if (exceedsHiveCustomJsonLimit(input.op.json)) {
    const upload = await uploadOdlToIpfs(input.op.json, input.objectId);
    if ('error' in upload) {
      return {
        success: false,
        error: upload.error === 'unauthorized' ? 'unauthorized' : 'upload_failed',
      };
    }
    opToBroadcast = buildOdlBatchImportOp({
      id: input.odlCustomJsonId,
      account: input.account,
      cid: upload.cid,
    });
    usedIpfsBatch = true;
  }

  try {
    const { transactionId } = await getWalletFacade().broadcast({
      operations: [opToBroadcast],
    });
    await awaitTrxConfirmation(transactionId);
    if (usedIpfsBatch) {
      await awaitBatchImportByTrx(transactionId);
    }
    return { success: true, transactionId, usedIpfsBatch };
  } catch {
    return { success: false, error: 'broadcast_failed' };
  }
}
