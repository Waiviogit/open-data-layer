import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  latLonToGeoJsonPoint,
  blockTimestampToUnixSeconds,
  OBJECT_TYPE_REGISTRY,
  UPDATE_REGISTRY,
  UPDATE_TYPES,
} from '@opden-data-layer/core';
import type { JsonValue, NewObjectUpdate } from '@opden-data-layer/odl-db-types';
import { HiveClient } from '@opden-data-layer/clients';
import {
  AccountSyncQueueRepository,
  AccountsCurrentRepository,
  ObjectsCoreRepository,
  ObjectUpdatesRepository,
  ValidityVotesRepository,
} from '../../../repositories';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { coerceGeoUpdateRawValue } from '../coerce-geo-update-raw-value';
import { coerceJsonUpdateRawValue } from '../coerce-json-update-raw-value';
import { updateCreatePayloadSchema } from '../odl-envelope.schema';
import { resolveEventAccount } from '../normalize-event-account';
import { WriteGuardRunner } from '../guards';
import {
  GovernanceObjectMutatedEvent,
  GOVERNANCE_OBJECT_MUTATED_EVENT,
} from '../../governance/governance-object-mutated.event';
import {
  USER_OBJECT_POWERS_CREATE_EVENT,
  UserObjectPowersCreateEvent,
} from '../../user-object-powers/user-object-powers.events';
import {
  SITE_CANONICAL_RECOMPUTE_EVENT,
  SiteCanonicalRecomputeEvent,
} from '../../site-canonical/site-canonical-recompute.event';
import {
  GroupIdMutatedEvent,
  GROUP_ID_MUTATED_EVENT,
} from '../group-id-mutated.event';
import {
  CategoryMutatedEvent,
  CATEGORY_MUTATED_EVENT,
} from '../category-mutated.event';
import {
  TagCategoryItemMutatedEvent,
  TAG_CATEGORY_ITEM_MUTATED_EVENT,
} from '../tag-category-item-mutated.event';
import {
  OBJECT_STATUS_RECOMPUTE_EVENT,
  ObjectStatusRecomputeEvent,
} from '../object-status-created.event';
import { NotificationEmitterService } from '../../notification-adapter/notification-emitter.service';

@Injectable()
export class UpdateCreateHandler implements OdlActionHandler {
  readonly action = 'update_create';
  private readonly logger = new Logger(UpdateCreateHandler.name);

  constructor(
    private readonly objectUpdatesRepository: ObjectUpdatesRepository,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly accountsCurrentRepository: AccountsCurrentRepository,
    private readonly accountSyncQueueRepository: AccountSyncQueueRepository,
    private readonly hiveClient: HiveClient,
    private readonly writeGuardRunner: WriteGuardRunner,
    private readonly validityVotesRepository: ValidityVotesRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationEmitter: NotificationEmitterService,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = updateCreatePayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(`Invalid update_create payload: ${result.error.message}`);
      return;
    }

    const {
      object_id,
      update_type,
      creator: payloadCreator,
      locale: payloadLocale,
    } = result.data;
    const { account: creator, mismatch } = resolveEventAccount(
      ctx.creator,
      payloadCreator,
    );
    if (mismatch) {
      this.logger.warn(
        `update_create: payload creator '${payloadCreator}' does not match posting auth '${ctx.creator}'; using posting auth`,
      );
    }

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

    const guardRejection = this.writeGuardRunner.check({
      action: 'update_create',
      object_type: object.object_type,
      object_id: object.object_id,
      object_creator: object.creator,
      event_creator: ctx.creator,
      update_type,
    });
    if (guardRejection) {
      this.logger.warn(`update_create rejected by guard: ${guardRejection}`);
      return;
    }

    const valueField =
      definition.value_kind === 'object_ref' || definition.value_kind === 'user_ref'
        ? 'value_text'
        : (`value_${definition.value_kind}` as const);
    let rawValue = payload[valueField];
    if (definition.value_kind === 'json') {
      rawValue = coerceJsonUpdateRawValue(definition, rawValue);
    } else if (definition.value_kind === 'geo') {
      rawValue = coerceGeoUpdateRawValue(rawValue);
    }
    const valueResult = definition.schema.safeParse(rawValue);
    if (!valueResult.success) {
      this.logger.warn(
        `Value validation failed for update_type '${update_type}': ${valueResult.error.message}`,
      );
      return;
    }

    if (definition.value_kind === 'object_ref') {
      const refId = String(valueResult.data);
      const referenced = await this.objectsCoreRepository.findByObjectId(refId);
      if (!referenced) {
        this.logger.warn(
          `update_create: referenced object '${refId}' not found for update_type '${update_type}'; skipping`,
        );
        return;
      }
      const allowed = definition.applies_to;
      if (allowed && allowed.length > 0 && !allowed.includes(referenced.object_type)) {
        this.logger.warn(
          `update_create: referenced object '${refId}' has object_type '${referenced.object_type}' not in applies_to for update_type '${update_type}'; skipping`,
        );
        return;
      }
    }

    if (definition.value_kind === 'user_ref') {
      const username = String(valueResult.data);
      const existing = await this.accountsCurrentRepository.findByName(username);
      if (!existing) {
        const hiveAccounts = await this.hiveClient.getAccounts([username]);
        if (!hiveAccounts[0]?.name) {
          this.logger.warn(
            `update_create: user '${username}' not found for update_type '${update_type}'; skipping`,
          );
          return;
        }
        await this.accountSyncQueueRepository.enqueue(
          username,
          Math.floor(Date.now() / 1000),
        );
      }
    }

    const effectiveLocale =
      definition.localizable === true ? (payloadLocale ?? null) : null;

    const geoForDb =
      definition.value_kind === 'geo'
        ? latLonToGeoJsonPoint(
            valueResult.data as { latitude: number; longitude: number },
          )
        : null;

    const update_id = `${ctx.transactionId}-${ctx.transactionIndex}-${ctx.operationIndex}-${ctx.odlEventIndex}`;

    const row: NewObjectUpdate = {
      update_id,
      object_id,
      update_type,
      creator,
      locale: effectiveLocale,
      created_at_unix: blockTimestampToUnixSeconds(ctx.timestamp),
      event_seq: ctx.eventSeq,
      transaction_id: ctx.transactionId,
      value_text:
        definition.value_kind === 'text' ||
        definition.value_kind === 'object_ref' ||
        definition.value_kind === 'user_ref'
          ? String(valueResult.data)
          : null,
      value_geo: geoForDb,
      value_json: definition.value_kind === 'json' ? (valueResult.data as JsonValue) : null,
    };

    const duplicate = await this.objectUpdatesRepository.existsByObjectAndValue(
      object_id,
      update_type,
      definition.value_kind,
      definition.value_kind === 'geo' ? geoForDb! : valueResult.data,
    );
    if (duplicate) {
      this.logger.warn(
        `update_create: duplicate value for '${update_type}' on '${object_id}'; skipping`,
      );
      return;
    }

    if (update_type === UPDATE_TYPES.IDENTIFIER) {
      const parsed = valueResult.data as { value: string; type: string };
      const identifierExists =
        await this.objectUpdatesRepository.existsIdentifierByValueAndType(
          parsed.value,
          parsed.type,
        );
      if (identifierExists) {
        this.logger.warn(
          `update_create: identifier '${parsed.type}:${parsed.value}' already exists globally; skipping`,
        );
        return;
      }
    }

    await this.objectUpdatesRepository.create(row);
    try {
      await this.validityVotesRepository.createIfAbsent({
        update_id,
        object_id,
        voter: creator,
        vote: 'for',
        event_seq: ctx.eventSeq,
        transaction_id: ctx.transactionId,
      });
    } catch (e) {
      this.logger.error((e as Error).message);
    }
    if (update_type === UPDATE_TYPES.STATUS) {
      const statusPayload = valueResult.data as { title: string; link?: string };
      this.eventEmitter.emit(
        OBJECT_STATUS_RECOMPUTE_EVENT,
        new ObjectStatusRecomputeEvent(object_id),
      );
      this.notificationEmitter.emitWithContext(
        this.notificationEmitter.odlContext(ctx),
        {
          type: 'object_status_change',
          objectId: object_id,
          actor: creator,
          payload: {
            objectName: null,
            authorPermlink: object.object_id,
            oldStatus: '',
            newStatus: String(statusPayload.title),
            account: creator,
          },
        },
      );
    }
    if (update_type === UPDATE_TYPES.CATEGORY) {
      this.eventEmitter.emit(CATEGORY_MUTATED_EVENT, new CategoryMutatedEvent(object_id));
    }
    if (
      update_type === UPDATE_TYPES.TAG_CATEGORY ||
      update_type === UPDATE_TYPES.TAG_CATEGORY_ITEM
    ) {
      this.eventEmitter.emit(
        TAG_CATEGORY_ITEM_MUTATED_EVENT,
        new TagCategoryItemMutatedEvent(object_id),
      );
    }
    if (update_type === UPDATE_TYPES.PRODUCT_GROUP_ID) {
      this.eventEmitter.emit(GROUP_ID_MUTATED_EVENT, new GroupIdMutatedEvent(object_id));
    }
    if (update_type === UPDATE_TYPES.DESCRIPTION) {
      this.eventEmitter.emit(
        SITE_CANONICAL_RECOMPUTE_EVENT,
        new SiteCanonicalRecomputeEvent(object_id),
      );
    }
    this.eventEmitter.emit(
      GOVERNANCE_OBJECT_MUTATED_EVENT,
      new GovernanceObjectMutatedEvent(object_id),
    );
    this.eventEmitter.emit(
      USER_OBJECT_POWERS_CREATE_EVENT,
      new UserObjectPowersCreateEvent(creator),
    );
    this.notificationEmitter.emitWithContext(
      this.notificationEmitter.odlContext(ctx),
      {
        type: 'object_update',
        objectId: object_id,
        actor: creator,
        payload: {
          updateId: update_id,
          updateType: update_type,
          objectName: null,
          authorPermlink: object.object_id,
        },
      },
    );
    this.notificationEmitter.emitTrxProcessedOdl(ctx);
  }
}
