import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core';
import { ObjectsCoreRepository } from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { objectCreatePayloadSchema } from '../odl-envelope.schema';
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

    const { object_id, object_type, creator } = result.data;

    if (!OBJECT_TYPE_REGISTRY[object_type]) {
      this.logger.warn(`Unknown object_type '${object_type}' in object_create; skipping`);
      return;
    }

    await this.objectsCoreRepository.create({
      object_id,
      object_type,
      creator,
      transaction_id: ctx.transactionId,
    });
    this.eventEmitter.emit(
      USER_OBJECT_POWERS_CREATE_EVENT,
      new UserObjectPowersCreateEvent(creator),
    );
  }
}
