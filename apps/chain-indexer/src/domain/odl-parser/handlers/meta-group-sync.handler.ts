import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import {
  AggregatedObjectRepository,
  ObjectsCoreRepository,
} from '../../../repositories';
import { GovernanceCacheService } from '../../governance/governance-cache.service';
import {
  CategoryMutatedEvent,
  CATEGORY_MUTATED_EVENT,
} from '../category-mutated.event';
import {
  GroupIdMutatedEvent,
  GROUP_ID_MUTATED_EVENT,
} from '../group-id-mutated.event';

@Injectable()
export class MetaGroupSyncHandler {
  private readonly logger = new Logger(MetaGroupSyncHandler.name);

  constructor(
    private readonly aggregatedObjectRepository: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly governanceCacheService: GovernanceCacheService,
    private readonly objectsCoreRepository: ObjectsCoreRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(GROUP_ID_MUTATED_EVENT)
  async handleGroupIdMutated(event: GroupIdMutatedEvent): Promise<void> {
    const objectId = event.objectId.trim();
    if (objectId.length === 0) {
      return;
    }

    try {
      const { objects, voterReputations } =
        await this.aggregatedObjectRepository.loadByObjectIds([objectId]);
      const aggregated = objects[0];
      if (!aggregated) {
        this.logger.warn(`meta_group sync: object '${objectId}' not found; skipping`);
        return;
      }

      const governance = await this.governanceCacheService.resolvePlatform();
      const views = this.objectViewService.resolve(
        [aggregated],
        voterReputations,
        {
          update_types: [UPDATE_TYPES.PRODUCT_GROUP_ID],
          governance,
        },
      );
      const view = views[0];
      const winningGroupId = view?.fields[UPDATE_TYPES.PRODUCT_GROUP_ID]?.values[0]?.value_text ?? null;

      if (winningGroupId === aggregated.core.meta_group_id) {
        return;
      }

      await this.objectsCoreRepository.update(objectId, { meta_group_id: winningGroupId });
      this.eventEmitter.emit(CATEGORY_MUTATED_EVENT, new CategoryMutatedEvent(objectId));
    } catch (error) {
      this.logger.error(
        `meta_group sync failed for '${objectId}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
