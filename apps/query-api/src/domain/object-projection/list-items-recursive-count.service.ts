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
import {
  LIST_COUNT_BFS_BATCH_SIZE,
  LIST_COUNT_CACHE_TTL_SEC,
  LIST_TREE_WARN_NODE_COUNT,
} from '../../constants/cache.constants';
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

  /** Dedupes concurrent in-flight counts for the same parent + list ref set. */
  private readonly inflight = new Map<string, Promise<Map<string, number>>>();

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

    const inflightKey = `${options.parentObjectId}:${[...new Set(listRefIds)].sort().join(',')}`;
    const existing = this.inflight.get(inflightKey);
    if (existing) {
      return existing;
    }

    const work = this.countForListRefIdsImpl(listRefIds, options).finally(() => {
      this.inflight.delete(inflightKey);
    });
    this.inflight.set(inflightKey, work);
    return work;
  }

  private async countForListRefIdsImpl(
    listRefIds: string[],
    options: ListItemsRecursiveCountOptions,
  ): Promise<Map<string, number>> {
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
      const started = Date.now();
      let nodesLoaded = 0;

      await Promise.all(
        uncached.map(async (listRefId) => {
          const { count, nodes } = await this.countOneListRoot(listRefId, options);
          nodesLoaded += nodes;
          out.set(listRefId, count);
          const key = redisKey.listItemCount(options.parentObjectId, listRefId);
          try {
            await redis.set(key, String(count), LIST_COUNT_CACHE_TTL_SEC);
          } catch (e) {
            this.logger.error((e as Error).message);
          }
        }),
      );

      const elapsedMs = Date.now() - started;
      if (nodesLoaded > LIST_TREE_WARN_NODE_COUNT || elapsedMs > 500) {
        this.logger.warn(
          `countForListRefIds parent=${options.parentObjectId} listRefs=${uncached.length} nodesLoaded=${nodesLoaded} ${elapsedMs}ms`,
        );
      }
    }

    return out;
  }

  /**
   * BFS over governance-winning `listItem` edges only (not all `object_updates` rows).
   */
  private async countOneListRoot(
    rootId: string,
    options: ListItemsRecursiveCountOptions,
  ): Promise<{ count: number; nodes: number }> {
    const objectMap = new Map<string, AggregatedObject>();
    const voterWaivPowers: VoterWaivPowerMap = new Map();
    const seen = new Set<string>([rootId]);
    const loaded = new Set<string>();

    let frontier = [rootId];
    let nodes = 0;

    while (frontier.length > 0) {
      const needLoad = frontier.filter((id) => !loaded.has(id));
      for (let i = 0; i < needLoad.length; i += LIST_COUNT_BFS_BATCH_SIZE) {
        const chunk = needLoad.slice(i, i + LIST_COUNT_BFS_BATCH_SIZE);
        const batch = await this.aggregatedObjectRepo.loadForListCount(chunk);
        for (const o of batch.objects) {
          objectMap.set(o.core.object_id, o);
        }
        for (const [account, power] of batch.voterWaivPowers) {
          voterWaivPowers.set(account, power);
        }
        for (const id of chunk) {
          loaded.add(id);
          nodes += 1;
        }
      }

      const nextFrontier: string[] = [];
      for (const id of frontier) {
        const agg = objectMap.get(id);
        if (!agg || agg.core.object_type !== 'list') {
          continue;
        }
        const views = this.objectViewService.resolve([agg], voterWaivPowers, {
          update_types: [UPDATE_TYPES.LIST_ITEM],
          locale: options.locale,
          include_rejected: false,
          governance: options.governance,
        });
        for (const childId of winningListItemRefIds(views[0])) {
          if (seen.has(childId)) {
            continue;
          }
          seen.add(childId);
          nextFrontier.push(childId);
        }
      }
      frontier = nextFrontier;
    }

    const handled = new Set<string>([options.parentObjectId, rootId]);
    const count = this.countInMemory(
      rootId,
      handled,
      false,
      options,
      objectMap,
      voterWaivPowers,
    );
    return { count, nodes };
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
