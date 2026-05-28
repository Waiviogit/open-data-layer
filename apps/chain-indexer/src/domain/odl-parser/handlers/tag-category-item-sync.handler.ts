import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ObjectTagCategoriesSyncQueueRepository } from '../../../repositories/object-tag-categories-sync-queue.repository';
import {
  OBJECT_STATUS_CREATED_EVENT,
  ObjectStatusCreatedEvent,
} from '../object-status-created.event';
import {
  TagCategoryItemMutatedEvent,
  TAG_CATEGORY_ITEM_MUTATED_EVENT,
} from '../tag-category-item-mutated.event';

@Injectable()
export class TagCategoryItemSyncHandler {
  private readonly logger = new Logger(TagCategoryItemSyncHandler.name);

  constructor(
    private readonly syncQueue: ObjectTagCategoriesSyncQueueRepository,
  ) {}

  private enqueuedAt(): number {
    return Math.floor(Date.now() / 1000);
  }

  private async enqueueObject(objectId: string): Promise<void> {
    const trimmed = objectId.trim();
    if (trimmed.length === 0) {
      return;
    }
    try {
      await this.syncQueue.enqueue(trimmed, this.enqueuedAt());
    } catch (error) {
      this.logger.error(
        `tag category item sync enqueue failed for '${trimmed}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @OnEvent(TAG_CATEGORY_ITEM_MUTATED_EVENT)
  async handleTagCategoryItemMutated(event: TagCategoryItemMutatedEvent): Promise<void> {
    await this.enqueueObject(event.objectId);
  }

  @OnEvent(OBJECT_STATUS_CREATED_EVENT)
  async handleObjectStatusCreated(event: ObjectStatusCreatedEvent): Promise<void> {
    await this.enqueueObject(event.objectId);
  }
}
