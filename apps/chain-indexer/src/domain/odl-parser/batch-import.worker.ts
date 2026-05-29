import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import {
  BATCH_IMPORT_COMPLETED_NOTIFICATION_EVENT,
  BatchImportCompletedNotificationPayload,
} from '../notification-adapter/events/notification-domain-events';
import { IpfsClient } from '@opden-data-layer/clients';
import { Readable, type Duplex } from 'node:stream';
import { chain } from 'stream-chain';
import streamJson from 'stream-json';

// stream-json subpaths are not resolved cleanly with moduleResolution "node"; use typed require.
const pickFilter = require('stream-json/filters/pick.js') as (opts: {
  filter: string;
}) => Duplex;
const streamArrayMod = require('stream-json/streamers/stream-array.js') as {
  asStream: (opts?: unknown) => Duplex;
};
import type { OdlActionHandler, OdlEventContext } from './odl-action-handler';
import {
  BATCH_IMPORT_PROCESS_EVENT,
  type BatchImportProcessPayload,
} from './handlers/batch-import.handler';
import { ObjectCreateHandler } from './handlers/object-create.handler';
import { UpdateCreateHandler } from './handlers/update-create.handler';
import { UpdateVoteHandler } from './handlers/update-vote.handler';
import { RankVoteHandler } from './handlers/rank-vote.handler';
import { AuthorityHandler } from './handlers/authority.handler';
import { UserMetadataHandler } from './handlers/user-metadata.handler';
import { ShopDeselectHandler } from './handlers/shop-deselect.handler';
import { odlEnvelopeEventSchema } from './odl-envelope.schema';

@Injectable()
export class BatchImportWorker {
  private readonly logger = new Logger(BatchImportWorker.name);
  private readonly handlerMap: Record<string, OdlActionHandler>;

  constructor(
    private readonly ipfsClient: IpfsClient,
    private readonly config: ConfigService,
    private readonly emitter: EventEmitter2,
    private readonly objectCreateHandler: ObjectCreateHandler,
    private readonly updateCreateHandler: UpdateCreateHandler,
    private readonly updateVoteHandler: UpdateVoteHandler,
    private readonly rankVoteHandler: RankVoteHandler,
    private readonly authorityHandler: AuthorityHandler,
    private readonly userMetadataHandler: UserMetadataHandler,
    private readonly shopDeselectHandler: ShopDeselectHandler,
  ) {
    this.handlerMap = {
      [this.objectCreateHandler.action]: this.objectCreateHandler,
      [this.updateCreateHandler.action]: this.updateCreateHandler,
      [this.updateVoteHandler.action]: this.updateVoteHandler,
      [this.rankVoteHandler.action]: this.rankVoteHandler,
      [this.authorityHandler.action]: this.authorityHandler,
      [this.userMetadataHandler.action]: this.userMetadataHandler,
      [this.shopDeselectHandler.action]: this.shopDeselectHandler,
    };
  }

  @OnEvent(BATCH_IMPORT_PROCESS_EVENT, { async: true })
  async handleBatchImport(data: BatchImportProcessPayload): Promise<void> {
    const { payload, ctx } = data;
    if (payload.type !== 'ipfs') {
      this.logger.warn('batch_import: unsupported type; skipping');
      return;
    }

    const ref: string = payload.ref;
    const maxRetries = this.config.get<number>('batchImport.maxRetries', 3);
    const baseDelayMs = this.config.get<number>('batchImport.retryDelayMs', 1000);

    let stream: Readable | undefined;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        stream = await this.ipfsClient.cat(ref);
        lastErr = undefined;
        break;
      } catch (err: unknown) {
        lastErr = err;
        if (attempt === maxRetries) {
          break;
        }
        const delay = baseDelayMs * 2 ** attempt;
        this.logger.warn(
          `IPFS cat failed (attempt ${attempt + 1}/${maxRetries + 1}), retry in ${delay}ms: ${err instanceof Error ? err.message : String(err)}`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    if (!stream) {
      this.logger.error(
        `batch_import: failed to fetch ref '${ref}' after retries: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
      );
      return;
    }

    const completed = await this.processEventStream(stream, ctx);
    if (!completed) {
      return;
    }

    this.emitter.emit(
      BATCH_IMPORT_COMPLETED_NOTIFICATION_EVENT,
      new BatchImportCompletedNotificationPayload(
        ref,
        ctx.creator,
        ctx.blockNum,
        ctx.transactionId,
        new Date().toISOString(),
      ),
    );
  }

  private async processEventStream(
    stream: Readable,
    parentCtx: OdlEventContext,
  ): Promise<boolean> {
    const pipeline = chain([
      stream,
      streamJson.parser(),
      pickFilter({ filter: 'events' }),
      streamArrayMod.asStream(),
    ]);

    let chainPromise = Promise.resolve();
    let childIndex = 0;
    const eventIdIndexMap = new Map<string, number>();

    try {
      await new Promise<void>((resolve, reject) => {
      pipeline.on('data', (item: { key: number; value: unknown }) => {
        chainPromise = chainPromise.then(async () => {
          const raw = item.value;
          const parsed = odlEnvelopeEventSchema.safeParse(raw);
          if (!parsed.success) {
            this.logger.warn(
              `batch_import: invalid event at index ${childIndex}: ${parsed.error.message}`,
            );
            childIndex += 1;
            return;
          }

          const event = parsed.data;
          if (event.action === 'batch_import') {
            childIndex += 1;
            return;
          }

          const handler = this.handlerMap[event.action];
          if (!handler) {
            this.logger.warn(
              `batch_import: unknown action '${event.action}' at index ${childIndex}; skipping`,
            );
            childIndex += 1;
            return;
          }

          if (event.event_id) {
            eventIdIndexMap.set(event.event_id, childIndex);
          }

          const ctx: OdlEventContext = {
            action: event.action,
            creator: parentCtx.creator,
            blockNum: parentCtx.blockNum,
            transactionIndex: parentCtx.transactionIndex,
            operationIndex: parentCtx.operationIndex,
            odlEventIndex: childIndex,
            transactionId: parentCtx.transactionId,
            timestamp: parentCtx.timestamp,
            eventSeq: parentCtx.eventSeq + BigInt(childIndex + 1),
            eventIdIndexMap,
          };

          try {
            await handler.handle(
              event.payload as Record<string, unknown>,
              ctx,
            );
          } catch (err: unknown) {
            this.logger.error(
              `batch_import: handler '${event.action}' failed at child ${childIndex}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }

          childIndex += 1;
        });
      });

      pipeline.on('end', () => {
        void chainPromise.then(() => resolve()).catch(reject);
      });
      pipeline.on('error', (err: unknown) => {
        void chainPromise.then(() => reject(err)).catch(reject);
      });
    });
      return true;
    } catch (err: unknown) {
      this.logger.error(
        `batch_import: stream parse failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}
