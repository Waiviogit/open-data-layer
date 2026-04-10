import type { HiveOperationPayload } from '../../domain/hive-operations';
import type { BroadcastTransactionResult } from '../../domain/types';

export interface IHiveSigner {
  sign(payload: HiveOperationPayload): Promise<BroadcastTransactionResult>;
}
