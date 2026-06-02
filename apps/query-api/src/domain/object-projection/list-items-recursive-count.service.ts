import { Injectable, Logger } from '@nestjs/common';
import { RedisClientFactory } from '@opden-data-layer/clients';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import type {
  AggregatedObject,
  GovernanceSnapshot,
  VoterWaivPowerMap,
} from '@opden-data-layer/objects-domain';
import { ObjectViewService } from '@opden-data-layer/objects-domain';
import type { ResolvedObjectView } from '@opden-data-layer/objects-domain';
import { LIST_COUNT_CACHE_TTL_SEC } from '../../constants/cache.constants';
import { redisKey } from '../../constants/redis-keys';
import { AggregatedObjectRepository } from '../../repositories';

export interface ListItemsRecursiveCountOptions {
  parentObjectId: string;
  governance: GovernanceSnapshot;
  locale: string;
  viewerAccount?: string;
}

/**
 * Recursive leaf-item counter for list-type refs (legacy Waivio `getItemsCount`).
 * Uses governance-resolved winning `listItem` refs, not raw `object_updates` rows.
 */
@Injectable()
export class ListItemsRecursiveCountService {
  private readonly logger = new Logger(ListItemsRecursiveCountService.name);

  constructor(
    private readonly aggregatedObjectRepo: AggregatedObjectRepository,
    private readonly objectViewService: ObjectViewService,
    private readonly redisFactory: RedisClientFactory,
  ) {}

  async countForListRefIds(
    listRefIds: string[],
    options: ListItemsRecursiveCountOptions,
  ): Promise<Map<string, number>> {
    if (listRefIds.length === 0) {
      return new Map();
    }
    const redis = this.redisFactory.getClient();
    const out = new Map<string, number>();
    const uncached: string[] = [];

    for (const listRefId of listRefIds) {
      const key = redisKey.listItemCount(options.parentObjectId, listRefId);
      try {
        const cached = await redis.get(key);
        if (cached !== null && cached !== undefined) {
          const n = Number(cached);
          if (Number.isFinite(n)) {
            out.set(listRefId, n);
            continue;
          }
        }
      } catch (e) {
        this.logger.error((e as Error).message);
      }
      uncached.push(listRefId);
    }

    if (uncached.length > 0) {
      const treeIdsByRoot =
        await this.aggregatedObjectRepo.loadListTreeIdsByRoots(uncached);

      const allIds = new Set<string>();
      for (const listRefId of uncached) {
        allIds.add(listRefId);
        for (const id of treeIdsByRoot.get(listRefId) ?? []) {
          allIds.add(id);
        }
      }

      const { objects, voterWaivPowers } = await this.aggregatedObjectRepo.loadForListCount(
        [...allIds],
      );

      const objectMap = new Map(objects.map((o) => [o.core.object_id, o]));

      for (const listRefId of uncached) {
        const handled = new Set<string>([options.parentObjectId, listRefId]);
        const count = this.countInMemory(
          listRefId,
          handled,
          false,
          options,
          objectMap,
          voterWaivPowers,
        );
        out.set(listRefId, count);
        const key = redisKey.listItemCount(options.parentObjectId, listRefId);
        try {
          await redis.set(key, String(count), LIST_COUNT_CACHE_TTL_SEC);
        } catch (e) {
          this.logger.error((e as Error).message);
        }
      }
    }

    return out;
  }

  private countInMemory(
    objectId: string,
    handled: Set<string>,
    recursive: boolean,
    options: ListItemsRecursiveCountOptions,
    objectMap: Map<string, AggregatedObject>,
    voterWaivPowers: VoterWaivPowerMap,
  ): number {
    const agg = objectMap.get(objectId);
    if (!agg) {
      return 0;
    }

    if (agg.core.object_type !== 'list') {
      return 1;
    }

    const views = this.objectViewService.resolve([agg], voterWaivPowers, {
      update_types: [UPDATE_TYPES.LIST_ITEM],
      locale: options.locale,
      include_rejected: false,
      governance: options.governance,
    });
    const childIds = winningListItemRefIds(views[0]);

    if (childIds.length === 0) {
      return recursive ? 1 : 0;
    }

    let count = 0;
    for (const childId of childIds) {
      if (handled.has(childId)) {
        continue;
      }
      handled.add(childId);
      count += this.countInMemory(
        childId,
        handled,
        true,
        options,
        objectMap,
        voterWaivPowers,
      );
    }
    return count;
  }
}

/** Winning VALID `listItem` refs, deduplicated by target id (first wins). */
export function winningListItemRefIds(view: ResolvedObjectView | undefined): string[] {
  if (!view) {
    return [];
  }
  const field = view.fields[UPDATE_TYPES.LIST_ITEM];
  if (!field) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of field.values) {
    if (u.validity_status !== 'VALID') {
      continue;
    }
    const id = u.value_text?.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}
