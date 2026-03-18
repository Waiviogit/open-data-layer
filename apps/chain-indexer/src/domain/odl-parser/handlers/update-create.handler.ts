import { Injectable, Logger } from '@nestjs/common';
import { UPDATE_REGISTRY, OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core';
import type { NewObjectUpdate } from '@opden-data-layer/core';
import { ObjectsCoreRepository, ObjectUpdatesRepository } from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { updateCreatePayloadSchema } from '../odl-envelope.schema';

@Injectable()
export class UpdateCreateHandler implements OdlActionHandler {
  readonly action = 'update_create';
  private readonly logger = new Logger(UpdateCreateHandler.name);

  constructor(
    private readonly objectUpdatesRepository: ObjectUpdatesRepository,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = updateCreatePayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid update_create payload: ${result.error.message}`);
      return;
    }

    const { object_id, update_type, creator, transaction_id } = result.data;

    const object = await this.objectsCoreRepository.findByObjectId(object_id);
    if (!object) {
      this.logger.warn(`update_create: object '${object_id}' not found; skipping`);
      return;
    }

    const objectTypeDef = OBJECT_TYPE_REGISTRY[object.object_type];
    if (!objectTypeDef?.supported_updates.includes(update_type)) {
      this.logger.warn(
        `update_create: update_type '${update_type}' not supported by object_type '${object.object_type}'; skipping`,
      );
      return;
    }

    const definition = UPDATE_REGISTRY[update_type];
    if (!definition) {
      this.logger.warn(`Unknown update_type '${update_type}' in update_create; skipping`);
      return;
    }

    const valueField = `value_${definition.value_kind}` as const;
    const rawValue = payload[valueField];
    const valueResult = definition.schema.safeParse(rawValue);
    if (!valueResult.success) {
      this.logger.warn(
        `Value validation failed for update_type '${update_type}': ${valueResult.error.message}`,
      );
      return;
    }

    const update_id = `${ctx.transactionId}-${ctx.transactionIndex}-${ctx.operationIndex}-${ctx.odlEventIndex}`;

    const row: NewObjectUpdate = {
      update_id,
      object_id,
      update_type,
      creator,
      created_at_unix: Math.floor(new Date(ctx.timestamp).getTime() / 1000),
      event_seq: ctx.eventSeq,
      transaction_id,
      value_text: definition.value_kind === 'text' ? String(valueResult.data) : null,
      value_geo: definition.value_kind === 'geo' ? valueResult.data : null,
      value_json: definition.value_kind === 'json' ? (valueResult.data as any) : null,
    };

    await this.objectUpdatesRepository.create(row);
  }
}
