import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { hiveBlockTimestampToDate, OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core';
import { ObjectsCoreRepository } from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { objectCreatePayloadSchema } from '../odl-envelope.schema';
import { resolveEventAccount } from '../normalize-event-account';
import {
  USER_OBJECT_POWERS_CREATE_EVENT,
  UserObjectPowersCreateEvent,
} from '../../user-object-powers/user-object-powers.events';

@Injectable()
export class ObjectCreateHandler implements OdlActionHandler {
  readonly action = 'object_create';
  private readonly logger = new Logger(ObjectCreateHandler.name);

  constructor(
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = objectCreatePayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid object_create payload: ${result.error.message}`);
      return;
    }

    const { object_id, object_type, creator: payloadCreator } = result.data;
    const { account: creator, mismatch } = resolveEventAccount(
      ctx.creator,
      payloadCreator,
    );
    if (mismatch) {
      this.logger.warn(
        `object_create: payload creator '${payloadCreator}' does not match posting auth '${ctx.creator}'; using posting auth`,
      );
    }

    if (!OBJECT_TYPE_REGISTRY[object_type]) {
      this.logger.warn(`Unknown object_type '${object_type}' in object_create; skipping`);
      return;
    }

    const existing = await this.objectsCoreRepository.findByObjectId(object_id);
    if (existing) {
      this.logger.warn(
        `object_create: object '${object_id}' already exists; skipping`,
      );
      return;
    }

    await this.objectsCoreRepository.create({
      object_id,
      object_type,
      creator,
      transaction_id: ctx.transactionId,
      created_at: hiveBlockTimestampToDate(ctx.timestamp),
    });
    this.eventEmitter.emit(
      USER_OBJECT_POWERS_CREATE_EVENT,
      new UserObjectPowersCreateEvent(creator),
    );
  }
}
