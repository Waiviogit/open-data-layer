import { buildRedisKey } from '@opden-data-layer/core';

const APP = 'query-api';

export const redisKey = {
  discoverTagCategories: (objectType: string) =>
    buildRedisKey(APP, 'cache', 'tag-categories', objectType),
} as const;
