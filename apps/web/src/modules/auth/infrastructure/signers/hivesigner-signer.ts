'use client';

import type { IHiveSigner } from '../../application/ports/hive-signer.port';
import type { HiveOperationPayload } from '@opden-data-layer/hive-broadcast';
import type { BroadcastTransactionResult } from '../../domain/types';

export function createHiveSignerSigner(): IHiveSigner {
  return {
    async sign(_payload: HiveOperationPayload): Promise<BroadcastTransactionResult> {
      void _payload;
      throw new Error('HiveSigner broadcast not yet implemented');
    },
  };
}
