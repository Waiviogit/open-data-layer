import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationEmitterService } from '../notification-adapter/notification-emitter.service';
import { IpfsClient } from '@opden-data-layer/clients';
import { Readable, Transform, type Duplex } from 'node:stream';
import { chain } from 'stream-chain';
import streamJson from 'stream-json';

// stream-json subpaths are not resolved cleanly with moduleResolution "node"; use typed require.
const pickModule = require('stream-json/filters/pick.js');
const pickFilter = (pickModule.default ?? pickModule) as (opts: {
  filter: string;
}) => Duplex;
const streamArrayModule = require('stream-json/streamers/stream-array.js');
const streamArrayMod = (streamArrayModule.default ?? streamArrayModule) as {
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
import { FavoriteHandler } from './handlers/favorite.handler';
import { OwnershipHandler } from './handlers/ownership.handler';
import { UserMetadataHandler } from '../osl-parser/handlers/user-metadata.handler';
import { ChannelCreateHandler } from '../osl-parser/handlers/channel-create.handler';
import { ChannelAliasRegisterHandler } from '../osl-parser/handlers/channel-alias-register.handler';
import { ChannelMemberAddHandler } from '../osl-parser/handlers/channel-member-add.handler';
import { ChannelMemberRemoveHandler } from '../osl-parser/handlers/channel-member-remove.handler';
import { ChannelLeaveHandler } from '../osl-parser/handlers/channel-leave.handler';
import { ChannelUpdateHandler } from '../osl-parser/handlers/channel-update.handler';
import { MessageCreateHandler } from '../osl-parser/handlers/message-create.handler';
import { MessageUpdateHandler } from '../osl-parser/handlers/message-update.handler';
import { MessageDeleteHandler } from '../osl-parser/handlers/message-delete.handler';
import { MessageContextExcludeHandler } from '../osl-parser/handlers/message-context-exclude.handler';
import { ShopDeselectHandler } from './handlers/shop-deselect.handler';
import {
  BATCH_IMPORT_MAX_BYTES,
  BATCH_IMPORT_MAX_EVENTS,
} from '../../constants/batch-import.constants';
import { batchImportChildEventSchema } from './odl-envelope.schema';

@Injectable()
export class BatchImportWorker {
  private readonly logger = new Logger(BatchImportWorker.name);
  private readonly handlerMap: Record<string, OdlActionHandler>;

  constructor(
    private readonly ipfsClient: IpfsClient,
    private readonly config: ConfigService,
    private readonly emitter: EventEmitter2,
    private readonly notificationEmitter: NotificationEmitterService,
    private readonly objectCreateHandler: ObjectCreateHandler,
    private readonly updateCreateHandler: UpdateCreateHandler,
    private readonly updateVoteHandler: UpdateVoteHandler,
    private readonly rankVoteHandler: RankVoteHandler,
    private readonly favoriteHandler: FavoriteHandler,
    private readonly ownershipHandler: OwnershipHandler,
    private readonly userMetadataHandler: UserMetadataHandler,
    private readonly channelCreateHandler: ChannelCreateHandler,
    private readonly channelAliasRegisterHandler: ChannelAliasRegisterHandler,
    private readonly channelMemberAddHandler: ChannelMemberAddHandler,
    private readonly channelMemberRemoveHandler: ChannelMemberRemoveHandler,
    private readonly channelLeaveHandler: ChannelLeaveHandler,
    private readonly channelUpdateHandler: ChannelUpdateHandler,
    private readonly messageCreateHandler: MessageCreateHandler,
    private readonly messageUpdateHandler: MessageUpdateHandler,
    private readonly messageDeleteHandler: MessageDeleteHandler,
    private readonly messageContextExcludeHandler: MessageContextExcludeHandler,
    private readonly shopDeselectHandler: ShopDeselectHandler,
  ) {
    this.handlerMap = {
      [this.objectCreateHandler.action]: this.objectCreateHandler,
      [this.updateCreateHandler.action]: this.updateCreateHandler,
      [this.updateVoteHandler.action]: this.updateVoteHandler,
      [this.rankVoteHandler.action]: this.rankVoteHandler,
      [this.favoriteHandler.action]: this.favoriteHandler,
      [this.ownershipHandler.action]: this.ownershipHandler,
      [this.userMetadataHandler.action]: this.userMetadataHandler,
      [this.channelCreateHandler.action]: this.channelCreateHandler,
      [this.channelAliasRegisterHandler.action]: this.channelAliasRegisterHandler,
      [this.channelMemberAddHandler.action]: this.channelMemberAddHandler,
      [this.channelMemberRemoveHandler.action]: this.channelMemberRemoveHandler,
      [this.channelLeaveHandler.action]: this.channelLeaveHandler,
      [this.channelUpdateHandler.action]: this.channelUpdateHandler,
      [this.messageCreateHandler.action]: this.messageCreateHandler,
      [this.messageUpdateHandler.action]: this.messageUpdateHandler,
      [this.messageDeleteHandler.action]: this.messageDeleteHandler,
      [this.messageContextExcludeHandler.action]: this.messageContextExcludeHandler,
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

    const completed = await this.processEventStream(stream, ctx, ref);
    if (!completed) {
      return;
    }

    this.notificationEmitter.emitWithContext(
      this.notificationEmitter.odlContext(ctx),
      {
        type: 'batch_import_completed',
        objectId: null,
        actor: ctx.creator,
        payload: { cid: ref },
      },
    );
  }

  private async processEventStream(
    stream: Readable,
    parentCtx: OdlEventContext,
    ref: string,
  ): Promise<boolean> {
    let bytesRead = 0;
    const byteCounter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        if (bytesRead + chunk.length > BATCH_IMPORT_MAX_BYTES) {
          cb(new Error('BATCH_IMPORT_TOO_LARGE'));
          return;
        }
        bytesRead += chunk.length;
        cb(null, chunk);
      },
    });

    const pipeline = chain([
      stream,
      byteCounter,
      streamJson(),
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
          if (childIndex >= BATCH_IMPORT_MAX_EVENTS) {
            if (childIndex === BATCH_IMPORT_MAX_EVENTS) {
              this.logger.warn(
                `batch_import: event cap ${BATCH_IMPORT_MAX_EVENTS} reached for '${ref}'; aborting rest`,
              );
            }
            childIndex += 1;
            return;
          }

          const raw = item.value;
          const parsed = batchImportChildEventSchema.safeParse(raw);
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
