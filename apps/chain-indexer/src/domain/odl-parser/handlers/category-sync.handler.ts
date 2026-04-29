import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  buildUserScopeKey,
  SHOP_TYPE_BUCKETS,
} from '@opden-data-layer/core';
import { ObjectAuthorityRepository } from '../../../repositories/object-authority.repository';
import { PostsRepository } from '../../../repositories/posts.repository';
import { ObjectCategoriesRelatedSyncQueueRepository } from '../../../repositories/object-categories-related-sync-queue.repository';
import { ObjectCategoriesSyncQueueRepository } from '../../../repositories/object-categories-sync-queue.repository';
import {
  CategoryMutatedEvent,
  CATEGORY_MUTATED_EVENT,
} from '../category-mutated.event';
import {
  AdministrativeAuthorityChangedEvent,
  ADMINISTRATIVE_AUTHORITY_CHANGED_EVENT,
} from '../authority-changed.event';
import {
  OwnershipAuthorityChangedEvent,
  OWNERSHIP_AUTHORITY_CHANGED_EVENT,
} from '../ownership-authority-changed.event';
import {
  UserMetadataChangedEvent,
  USER_METADATA_CHANGED_EVENT,
} from '../user-metadata-changed.event';
import {
  UserShopDeselectChangedEvent,
  USER_SHOP_DESELECT_CHANGED_EVENT,
} from '../user-shop-deselect-changed.event';
import {
  PostObjectChangedEvent,
  POST_OBJECT_CHANGED_EVENT,
} from '../post-object-changed.event';

/**
 * Enqueues per-object category recompute and dependent scope aggregation jobs.
 */
@Injectable()
export class CategorySyncHandler {
  private readonly logger = new Logger(CategorySyncHandler.name);

  constructor(
    private readonly objectCategoriesSyncQueueRepository: ObjectCategoriesSyncQueueRepository,
    private readonly objectCategoriesRelatedSyncQueueRepository: ObjectCategoriesRelatedSyncQueueRepository,
    private readonly objectAuthorityRepository: ObjectAuthorityRepository,
    private readonly postsRepository: PostsRepository,
  ) {}

  private enqueuedAt(): number {
    return Math.floor(Date.now() / 1000);
  }

  private async enqueueUserShopBuckets(accountRaw: string, t: number): Promise<void> {
    const account = accountRaw.trim();
    if (account.length === 0) {
      return;
    }
    for (const bucket of SHOP_TYPE_BUCKETS) {
      const scopeKey = buildUserScopeKey(account, bucket);
      await this.objectCategoriesRelatedSyncQueueRepository.enqueue('user', scopeKey, t);
    }
  }

  @OnEvent(CATEGORY_MUTATED_EVENT)
  async handleCategoryMutated(event: CategoryMutatedEvent): Promise<void> {
    const objectId = event.objectId.trim();
    if (objectId.length === 0) {
      return;
    }
    try {
      const t = this.enqueuedAt();
      await this.objectCategoriesSyncQueueRepository.enqueue(objectId, t);

      await this.objectCategoriesRelatedSyncQueueRepository.enqueue('global', '_', t);

      const rows = await this.objectAuthorityRepository.findByObjectId(objectId);
      const seen = new Set<string>();
      for (const row of rows) {
        if (row.authority_type === 'ownership' || row.authority_type === 'administrative') {
          seen.add(row.account);
        }
      }

      const postAuthors = await this.postsRepository.findDistinctAuthorsByLinkedObject(objectId);
      for (const a of postAuthors) {
        seen.add(a);
      }

      for (const acc of seen) {
        await this.enqueueUserShopBuckets(acc, t);
      }
    } catch (error) {
      this.logger.error(
        `category sync enqueue failed for '${objectId}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @OnEvent(ADMINISTRATIVE_AUTHORITY_CHANGED_EVENT)
  async handleAdministrativeAuthorityChanged(
    event: AdministrativeAuthorityChangedEvent,
  ): Promise<void> {
    await this.enqueueUserShopAccount(event.account);
  }

  @OnEvent(USER_METADATA_CHANGED_EVENT)
  async handleUserMetadataChanged(event: UserMetadataChangedEvent): Promise<void> {
    await this.enqueueUserShopAccount(event.account);
  }

  @OnEvent(USER_SHOP_DESELECT_CHANGED_EVENT)
  async handleShopDeselectChanged(event: UserShopDeselectChangedEvent): Promise<void> {
    await this.enqueueUserShopAccount(event.account);
  }

  @OnEvent(POST_OBJECT_CHANGED_EVENT)
  async handlePostObjectChanged(event: PostObjectChangedEvent): Promise<void> {
    await this.enqueueUserShopAccount(event.postAuthor);
  }

  @OnEvent(OWNERSHIP_AUTHORITY_CHANGED_EVENT)
  async handleOwnershipAuthorityChanged(event: OwnershipAuthorityChangedEvent): Promise<void> {
    await this.enqueueUserShopAccount(event.account);
  }

  private async enqueueUserShopAccount(accountRaw: string): Promise<void> {
    const account = accountRaw.trim();
    if (account.length === 0) {
      return;
    }
    try {
      const t = this.enqueuedAt();
      await this.enqueueUserShopBuckets(account, t);
    } catch (error) {
      this.logger.error(
        `category related scope enqueue failed for '${account}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
