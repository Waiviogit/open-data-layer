import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories/aggregated-object.repository';
import { ObjectTagCategoryItemsRepository } from '../../repositories/object-tag-category-items.repository';
import { ObjectTagCategoriesSyncQueueRepository } from '../../repositories/object-tag-categories-sync-queue.repository';
import { GovernanceCacheService } from '../governance/governance-cache.service';
import {
  getSupposedTagCategoryNames,
  pickMaterializedTagItems,
} from './pick-materialized-tag-items';
import {
  MAX_TAG_ITEMS_PER_CATEGORY,
  OBJECT_TAG_CATEGORIES_RETRY_AFTER_SEC,
  OBJECT_TAG_CATEGORIES_WORKER_BATCH_SIZE,
  OBJECT_TAG_CATEGORIES_WORKER_INTERVAL_NAME,
} from '../../constants/object-tag-categories.constants';

const DEFAULT_INTERVAL_MS = 3_000;
const DEFAULT_MAX_ATTEMPTS = 10;

@Injectable()
export class ObjectTagCategoriesWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ObjectTagCategoriesWorker.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly syncQueue: ObjectTagCategoriesSyncQueueRepository,
    private readonly aggregatedObjectRepository: AggregatedObjectRepository,
    private readonly governanceCacheService: GovernanceCacheService,
    private readonly objectViewService: ObjectViewService,
    private readonly tagCategoryItemsRepository: ObjectTagCategoryItemsRepository,
  ) {}

  onModuleInit(): void {
    const raw = this.configService.get<number>(
      'objectTagCategories.intervalMs',
      DEFAULT_INTERVAL_MS,
    );
    const intervalMs = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INTERVAL_MS;
    const id = setInterval(() => {
      void this.runBatch();
    }, intervalMs);
    this.schedulerRegistry.addInterval(OBJECT_TAG_CATEGORIES_WORKER_INTERVAL_NAME, id);
  }

  onModuleDestroy(): void {
    try {
      this.schedulerRegistry.deleteInterval(OBJECT_TAG_CATEGORIES_WORKER_INTERVAL_NAME);
    } catch {
      // Tests may omit ScheduleModule.
    }
  }

  async runBatch(): Promise<void> {
    const batchSize = this.configService.get<number>(
      'objectTagCategories.batchSize',
      OBJECT_TAG_CATEGORIES_WORKER_BATCH_SIZE,
    );
    const maxAttempts = this.configService.get<number>(
      'objectTagCategories.maxAttempts',
      DEFAULT_MAX_ATTEMPTS,
    );
    const limit = batchSize > 0 ? batchSize : OBJECT_TAG_CATEGORIES_WORKER_BATCH_SIZE;

    const tasks = await this.syncQueue.claimBatch(
      limit,
      OBJECT_TAG_CATEGORIES_RETRY_AFTER_SEC,
    );

    for (const task of tasks) {
      await this.processTask(task.object_id, task.attempts, maxAttempts);
    }
  }

  private async processTask(
    objectId: string,
    attempts: number,
    maxAttempts: number,
  ): Promise<void> {
    try {
      const { objects, voterWaivPowers } =
        await this.aggregatedObjectRepository.loadByObjectIds([objectId]);
      const aggregated = objects[0];
      if (!aggregated) {
        this.logger.warn(
          `object_tag_category_items: '${objectId}' not found; dropping queue row`,
        );
        await this.syncQueue.deleteOne(objectId);
        return;
      }

      const objectType = aggregated.core.object_type;
      const isActive = aggregated.core.status === 'active';
      let items: ReturnType<typeof pickMaterializedTagItems> = [];
      if (isActive) {
        const governance = await this.governanceCacheService.resolvePlatform();
        const views = this.objectViewService.resolve([aggregated], voterWaivPowers, {
          update_types: [UPDATE_TYPES.TAG_CATEGORY_ITEM],
          governance,
        });
        const allowed = getSupposedTagCategoryNames(objectType);
        items = pickMaterializedTagItems(
          views[0],
          allowed,
          MAX_TAG_ITEMS_PER_CATEGORY,
        );
      }

      await this.tagCategoryItemsRepository.replaceForObject(
        objectId,
        objectType,
        items,
      );
      await this.syncQueue.deleteOne(objectId);
    } catch (error: unknown) {
      this.logger.error(
        `object_tag_category_items recompute '${objectId}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (attempts >= maxAttempts) {
        await this.syncQueue.deleteOne(objectId);
      } else {
        await this.syncQueue.resetAttempt(objectId);
      }
    }
  }
}
