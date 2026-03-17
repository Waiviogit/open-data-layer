import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomJsonOperation } from '@hiveio/dhive/lib/chain/operation';
import { HiveTransaction } from '@opden-data-layer/clients';
import { parseJson } from '@opden-data-layer/core';




type CustomJsonHandler = (
  payload: CustomJsonOperation[1],
  transaction: HiveTransaction,
  timestamp: string,
  operationIndex: number,
) => Promise<void>;

@Injectable()
export class HiveCustomJsonParser {
  private readonly logger = new Logger(HiveCustomJsonParser.name);
  private readonly handlers: Record<
    string,
    { enabled: boolean; handle: CustomJsonHandler }
  >;

  constructor(
    private readonly configService: ConfigService,
  ) {

  }

  private getTransactionAccount(customJson: CustomJsonOperation[1]): string {
    return customJson.required_posting_auths[0] || customJson.required_auths[0];
  }

  async parse(
    payload: CustomJsonOperation[1],
    transaction: HiveTransaction,
    timestamp: string,
    operationIndex: number,
  ): Promise<void> {
    const handler = this.handlers[payload.id];
    if (!handler?.enabled) return;

  }

}
