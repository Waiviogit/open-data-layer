import { createHash } from 'node:crypto';

import type { RedisClientFactory } from '@opden-data-layer/clients';
import type { Logger } from '@nestjs/common';

import { OBJECT_REF_EXPANSION_CACHE_TTL_SEC } from '../../constants/cache.constants';
import { redisKey } from '../../constants/redis-keys';
import { expandObjectRefs } from './object-ref-expansion';
import type { RefSummary } from './projected-object.types';

function refIdsCacheSegment(refIds: readonly string[]): string {
  const sorted = [...new Set(refIds.map((id) => id.trim()).filter((id) => id.length > 0))].sort();
  if (sorted.length === 0) {
    return 'none';
  }
  const joined = sorted.join(',');
  if (joined.length <= 100) {
    return joined;
  }
  return createHash('sha256').update(joined).digest('hex').slice(0, 16);
}

type ExpandObjectRefsDeps = Parameters<typeof expandObjectRefs>[1];

export async function expandObjectRefsWithCache(
  refIds: string[],
  deps: ExpandObjectRefsDeps,
  redisFactory: RedisClientFactory,
  logger: Logger,
): Promise<Map<string, RefSummary>> {
  if (refIds.length === 0) {
    return new Map();
  }

  const viewerSegment = deps.viewerAccount?.trim() || 'anon';
  const refSegment = refIdsCacheSegment(refIds);
  const key = redisKey.objectRefExpansion(deps.parentObjectId, deps.locale, viewerSegment, refSegment);
  const redis = redisFactory.getClient();

  try {
    const cached = await redis.get(key);
    if (cached != null && cached !== '') {
      const parsed: unknown = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const map = new Map<string, RefSummary>();
        for (const row of parsed) {
          if (
            row != null &&
            typeof row === 'object' &&
            typeof (row as RefSummary).object_id === 'string'
          ) {
            const summary = row as RefSummary;
            map.set(summary.object_id, summary);
          }
        }
        if (map.size > 0) {
          return map;
        }
      }
    }
  } catch (e) {
    logger.error((e as Error).message);
  }

  const result = await expandObjectRefs(refIds, deps);

  try {
    await redis.set(
      key,
      JSON.stringify([...result.values()]),
      OBJECT_REF_EXPANSION_CACHE_TTL_SEC,
    );
  } catch (e) {
    logger.error((e as Error).message);
  }

  return result;
}
