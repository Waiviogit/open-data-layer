import { buildRedisKey } from '@opden-data-layer/core';

const APP = 'chain-indexer';

export const redisKey = {
  hiveBlockNumber: () => buildRedisKey(APP, 'cache', 'hive', 'block-number'),
  governanceSnapshot: (objectId: string) =>
    buildRedisKey(APP, 'cache', 'governance', 'snapshot', objectId),
} as const;
