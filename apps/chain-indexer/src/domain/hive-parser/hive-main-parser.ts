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
import {
  HiveOperationHandler,
  HiveOperationHandlerContext,
} from './hive-handler-context';

@Injectable()
export class HiveMainParser {
  private readonly logger = new Logger(HiveMainParser.name);
  private readonly handlers: Record<string, { handle: HiveOperationHandler<Operation[1]> }>;

  constructor(
    private readonly configService: ConfigService,
    private readonly customJsonParser: HiveCustomJsonParser,
  ) {
    this.handlers = {
      [HIVE_OPERATION.CUSTOM_JSON]: {
        handle: (p, ctx) =>
          this.customJsonParser.parse(p as CustomJsonOperation[1], ctx),
      },
    };
  }

  async parseBlock(block: SignedBlock): Promise<void> {
    const transactions = block.transactions as HiveTransaction[];
    const { timestamp } = block;

    for (let transactionIndex = 0; transactionIndex < transactions.length; transactionIndex++) {
      const transaction = transactions[transactionIndex];
      if (!transaction?.operations?.length) continue;

      const operations = transaction.operations as [
        string,
        Record<string, unknown>,
      ][];
      for (let operationIndex = 0; operationIndex < operations.length; operationIndex++) {
        const [type, payload] = operations[operationIndex];
        const handler = this.handlers[type];
        if (!handler) continue;

        const context: HiveOperationHandlerContext = {
          transaction,
          timestamp,
          blockNum: transaction.block_num,
          transactionIndex,
          operationIndex,
        };
        try {
          await handler.handle(payload, context);
        } catch (error: unknown) {
          this.logger.error(
            `Handler [${type}] failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }
}
