import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import { AggregatedObjectRepository } from '../../repositories/aggregated-object.repository';
import { ObjectCategoriesRepository } from '../../repositories/object-categories.repository';
import { ObjectCategoriesSyncQueueRepository } from '../../repositories/object-categories-sync-queue.repository';
import { GovernanceCacheService } from '../governance/governance-cache.service';
import {
  MAX_CATEGORIES_PER_OBJECT,
  OBJECT_CATEGORIES_RETRY_AFTER_SEC,
  OBJECT_CATEGORIES_WORKER_BATCH_SIZE,
  OBJECT_CATEGORIES_WORKER_INTERVAL_NAME,
} from '../../constants/object-categories.constants';

const DEFAULT_INTERVAL_MS = 3_000;
const DEFAULT_MAX_ATTEMPTS = 10;

@Injectable()
export class ObjectCategoriesWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ObjectCategoriesWorker.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly objectCategoriesSyncQueueRepository: ObjectCategoriesSyncQueueRepository,
    private readonly aggregatedObjectRepository: AggregatedObjectRepository,
    private readonly governanceCacheService: GovernanceCacheService,
    private readonly objectViewService: ObjectViewService,
    private readonly objectCategoriesRepository: ObjectCategoriesRepository,
  ) {}

  onModuleInit(): void {
    const raw = this.configService.get<number>('objectCategories.intervalMs', DEFAULT_INTERVAL_MS);
    const intervalMs = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INTERVAL_MS;
    const id = setInterval(() => {
      void this.runBatch();
    }, intervalMs);
    this.schedulerRegistry.addInterval(OBJECT_CATEGORIES_WORKER_INTERVAL_NAME, id);
  }

  onModuleDestroy(): void {
    try {
      this.schedulerRegistry.deleteInterval(OBJECT_CATEGORIES_WORKER_INTERVAL_NAME);
    } catch {
      // Tests may omit ScheduleModule.
    }
  }

  async runBatch(): Promise<void> {
    const batchSize = this.configService.get<number>(
      'objectCategories.batchSize',
      OBJECT_CATEGORIES_WORKER_BATCH_SIZE,
    );
    const maxAttempts = this.configService.get<number>(
      'objectCategories.maxAttempts',
      DEFAULT_MAX_ATTEMPTS,
    );
    const limit = batchSize > 0 ? batchSize : OBJECT_CATEGORIES_WORKER_BATCH_SIZE;

    const tasks = await this.objectCategoriesSyncQueueRepository.claimBatch(
      limit,
      OBJECT_CATEGORIES_RETRY_AFTER_SEC,
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
      const { objects, voterReputations } =
        await this.aggregatedObjectRepository.loadByObjectIds([objectId]);
      const aggregated = objects[0];
      if (!aggregated) {
        this.logger.warn(`object_categories: '${objectId}' not found; dropping queue row`);
        await this.objectCategoriesSyncQueueRepository.deleteOne(objectId);
        return;
      }

      const governance = await this.governanceCacheService.resolvePlatform();
      const views = this.objectViewService.resolve([aggregated], voterReputations, {
        update_types: [UPDATE_TYPES.CATEGORY],
        governance,
      });
      const view = views[0];
      const field = view?.fields[UPDATE_TYPES.CATEGORY];
      const values = field?.values ?? [];

      const picks = values.slice(0, MAX_CATEGORIES_PER_OBJECT);
      const names = picks
        .map((v) => v.value_text?.trim())
        .filter((t): t is string => !!t && t.length > 0);

      let maxSeq = 0n;
      if (picks.length > 0) {
        for (const v of picks) {
          if (v.event_seq > maxSeq) {
            maxSeq = v.event_seq;
          }
        }
      } else {
        const categoryUpdates = aggregated.updates.filter(
          (u) => u.update_type === UPDATE_TYPES.CATEGORY,
        );
        for (const u of categoryUpdates) {
          if (u.event_seq > maxSeq) {
            maxSeq = u.event_seq;
          }
        }
      }

      const coreRow = aggregated.core;

      await this.objectCategoriesRepository.upsert({
        object_id: objectId,
        meta_group_id: coreRow.meta_group_id,
        category_names: names,
        updated_at_seq: maxSeq,
      });

      await this.objectCategoriesSyncQueueRepository.deleteOne(objectId);
    } catch (error: unknown) {
      this.logger.error(
        `object_categories recompute '${objectId}': ${error instanceof Error ? error.message : String(error)}`,
      );
      if (attempts >= maxAttempts) {
        await this.objectCategoriesSyncQueueRepository.deleteOne(objectId);
      } else {
        await this.objectCategoriesSyncQueueRepository.resetAttempt(objectId);
      }
    }
  }
}
