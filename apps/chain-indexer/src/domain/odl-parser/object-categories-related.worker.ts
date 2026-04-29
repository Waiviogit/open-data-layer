import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { ObjectCategoriesRelatedSyncQueueRow } from '@opden-data-layer/core';
import { parseUserScopeKey, SHOP_TYPE_BUCKETS } from '@opden-data-layer/core';
import { ObjectCategoriesRelatedRepository } from '../../repositories/object-categories-related.repository';
import { ObjectCategoriesRelatedSyncQueueRepository } from '../../repositories/object-categories-related-sync-queue.repository';
import { UserMetadataRepository } from '../../repositories/user-metadata.repository';
import { UserShopDeselectRepository } from '../../repositories/user-shop-deselect.repository';
import {
  OBJECT_CATEGORIES_RELATED_WORKER_BATCH_SIZE,
  OBJECT_CATEGORIES_RELATED_WORKER_INTERVAL_NAME,
  OBJECT_CATEGORIES_RETRY_AFTER_SEC,
} from '../../constants/object-categories.constants';

const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 10;

/** True when types match the recipe bucket (`['recipe']`). */
function isRecipeBucket(types: readonly string[]): boolean {
  const b = SHOP_TYPE_BUCKETS[1];
  if (!b || types.length !== b.length) {
    return false;
  }
  const s = [...types].sort().join(',');
  return [...b].sort().join(',') === s;
}

@Injectable()
export class ObjectCategoriesRelatedWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ObjectCategoriesRelatedWorker.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly relatedSyncQueueRepository: ObjectCategoriesRelatedSyncQueueRepository,
    private readonly objectCategoriesRelatedRepository: ObjectCategoriesRelatedRepository,
    private readonly userMetadataRepository: UserMetadataRepository,
    private readonly userShopDeselectRepository: UserShopDeselectRepository,
  ) {}

  onModuleInit(): void {
    const raw = this.configService.get<number>(
      'objectCategoriesRelated.intervalMs',
      DEFAULT_INTERVAL_MS,
    );
    const intervalMs = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INTERVAL_MS;
    const id = setInterval(() => {
      void this.runBatch();
    }, intervalMs);
    this.schedulerRegistry.addInterval(OBJECT_CATEGORIES_RELATED_WORKER_INTERVAL_NAME, id);
  }

  onModuleDestroy(): void {
    try {
      this.schedulerRegistry.deleteInterval(OBJECT_CATEGORIES_RELATED_WORKER_INTERVAL_NAME);
    } catch {
      // ignore
    }
  }

  async runBatch(): Promise<void> {
    const batchSize = this.configService.get<number>(
      'objectCategoriesRelated.batchSize',
      OBJECT_CATEGORIES_RELATED_WORKER_BATCH_SIZE,
    );
    const maxAttempts = this.configService.get<number>(
      'objectCategoriesRelated.maxAttempts',
      DEFAULT_MAX_ATTEMPTS,
    );
    const limit = batchSize > 0 ? batchSize : OBJECT_CATEGORIES_RELATED_WORKER_BATCH_SIZE;

    const tasks = await this.relatedSyncQueueRepository.claimBatch(
      limit,
      OBJECT_CATEGORIES_RETRY_AFTER_SEC,
    );

    for (const task of tasks) {
      await this.processTask(task, maxAttempts);
    }
  }

  private async processTask(task: ObjectCategoriesRelatedSyncQueueRow, maxAttempts: number): Promise<void> {
    try {
      if (task.scope_type === 'global') {
        await this.objectCategoriesRelatedRepository.replaceGlobalScope();
      } else {
        const { account, types } = parseUserScopeKey(task.scope_key);

        const meta = await this.userMetadataRepository.findByAccount(account);

        const includePostObjects =
          meta === undefined
            ? true
            : isRecipeBucket(types)
              ? !meta.hide_recipe_objects
              : !meta.hide_linked_objects;

        const shopDeselectObjectIds =
          await this.userShopDeselectRepository.findObjectIdsByAccount(account);

        await this.objectCategoriesRelatedRepository.replaceUserShopScope(task.scope_key, {
          account,
          types,
          includePostObjects,
          shopDeselectObjectIds,
        });
      }
      await this.relatedSyncQueueRepository.deleteOne(task.scope_type, task.scope_key);
    } catch (error: unknown) {
      this.logger.error(
        `object_categories_related scope '${task.scope_type}/${task.scope_key}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (task.attempts >= maxAttempts) {
        await this.relatedSyncQueueRepository.deleteOne(task.scope_type, task.scope_key);
      } else {
        await this.relatedSyncQueueRepository.resetAttempt(task.scope_type, task.scope_key);
      }
    }
  }
}
