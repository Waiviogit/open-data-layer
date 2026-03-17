import { HiveTransaction } from '@opden-data-layer/clients';

/** Context passed to every Hive operation handler. */
export interface HiveOperationHandlerContext {
  transaction: HiveTransaction;
  timestamp: string;
  blockNum: number;
  transactionIndex: number;
  operationIndex: number;
}

/** Handler for a single Hive operation type. Receives payload and context. */
export type HiveOperationHandler<P = unknown> = (
  payload: P,
  context: HiveOperationHandlerContext,
) => Promise<void>;
