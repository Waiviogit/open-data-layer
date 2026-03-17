import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignedBlock } from '@hiveio/dhive/lib/chain/block';
import { HIVE_OPERATION } from '../../constants/hive-parser';
import {
  CustomJsonOperation,
  Operation,
} from '@hiveio/dhive/lib/chain/operation';
import { HiveTransaction } from '@opden-data-layer/clients';
import { HiveCustomJsonParser } from './hive-custom-json-parser';

type OperationHandler = (
  payload: Operation[1],
  transaction: HiveTransaction,
  timestamp: string,
  operationIndex: number,
) => Promise<void>;

@Injectable()
export class HiveMainParser {
  private readonly logger = new Logger(HiveMainParser.name);
  private readonly handlers: Record<
    string,
    {  handle: OperationHandler }
  >;

  constructor(
    private readonly configService: ConfigService,
    private readonly customJsonParser: HiveCustomJsonParser,
  ) {
    this.handlers = {
      [HIVE_OPERATION.CUSTOM_JSON]: {
        handle: (p, t, ts, idx) =>
          this.customJsonParser.parse(p as CustomJsonOperation[1], t, ts, idx),
      },
    };
  }

  async parseBlock(block: SignedBlock): Promise<void> {
    const transactions = block.transactions as HiveTransaction[];
    const { timestamp } = block;

    for (const transaction of transactions) {
      if (!transaction?.operations?.length) continue;

      const operations = transaction.operations as [
        string,
        Record<string, unknown>,
      ][];
      for (let i = 0; i < operations.length; i++) {
        const [type, payload] = operations[i];
        const handler = this.handlers[type];
        if(!handler) continue;

        try {
          await handler.handle(payload, transaction, timestamp, i);
        } catch (error: unknown) {
          this.logger.error(
            `Handler [${type}] failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }
}
