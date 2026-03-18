import { Injectable, Logger } from '@nestjs/common';
import { encodeEventSeq } from '@opden-data-layer/core';
import type { HiveOperationHandlerContext } from '../hive-parser/hive-handler-context';
import type { OdlActionHandler, OdlEventContext } from './odl-action-handler';
import { odlEnvelopeSchema } from './odl-envelope.schema';
import { ObjectCreateHandler } from './handlers/object-create.handler';
import { UpdateCreateHandler } from './handlers/update-create.handler';
import { UpdateVoteHandler } from './handlers/update-vote.handler';
import { RankVoteHandler } from './handlers/rank-vote.handler';
import { AuthorityHandler } from './handlers/authority.handler';

@Injectable()
export class OdlCustomJsonParser {
  private readonly logger = new Logger(OdlCustomJsonParser.name);
  private readonly handlerMap: Record<string, OdlActionHandler>;

  constructor(
    private readonly objectCreateHandler: ObjectCreateHandler,
    private readonly updateCreateHandler: UpdateCreateHandler,
    private readonly updateVoteHandler: UpdateVoteHandler,
    private readonly rankVoteHandler: RankVoteHandler,
    private readonly authorityHandler: AuthorityHandler,
  ) {
    this.handlerMap = {
      [this.objectCreateHandler.action]: this.objectCreateHandler,
      [this.updateCreateHandler.action]: this.updateCreateHandler,
      [this.updateVoteHandler.action]: this.updateVoteHandler,
      [this.rankVoteHandler.action]: this.rankVoteHandler,
      [this.authorityHandler.action]: this.authorityHandler,
    };
  }

  async parse(
    rawJson: string,
    account: string,
    hiveCtx: HiveOperationHandlerContext,
  ): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      this.logger.warn('ODL custom_json: failed to parse JSON');
      return;
    }

    const envelopeResult = odlEnvelopeSchema.safeParse(parsed);
    if (!envelopeResult.success) {
      this.logger.warn(`ODL envelope validation failed: ${envelopeResult.error.message}`);
      return;
    }

    const { events } = envelopeResult.data;

    for (let odlEventIndex = 0; odlEventIndex < events.length; odlEventIndex++) {
      const event = events[odlEventIndex];
      const handler = this.handlerMap[event.action];

      if (!handler) {
        this.logger.warn(`ODL: unknown action '${event.action}'; skipping`);
        continue;
      }

      const ctx: OdlEventContext = {
        action: event.action,
        creator: account,
        blockNum: hiveCtx.blockNum,
        transactionIndex: hiveCtx.transactionIndex,
        operationIndex: hiveCtx.operationIndex,
        odlEventIndex,
        transactionId: hiveCtx.transaction.transaction_id,
        timestamp: hiveCtx.timestamp,
        eventSeq: encodeEventSeq({
          blockNum: hiveCtx.blockNum,
          trxIndex: hiveCtx.transactionIndex,
          opIndex: hiveCtx.operationIndex,
          odlEventIndex,
        }),
      };

      try {
        await handler.handle(event.payload, ctx);
      } catch (err: unknown) {
        this.logger.error(
          `ODL handler '${event.action}' failed at block ${hiveCtx.blockNum}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
