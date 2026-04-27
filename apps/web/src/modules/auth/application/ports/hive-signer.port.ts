import type { HiveOperationPayload } from '@opden-data-layer/hive-broadcast';
import type { BroadcastTransactionResult } from '../../domain/types';

export interface IHiveSigner {
  sign(payload: HiveOperationPayload): Promise<BroadcastTransactionResult>;
}
