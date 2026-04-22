import { buildRedisKey } from '@opden-data-layer/core';

const APP = 'scheduler';

export const schedulerRedisKey = {
  enqueueLock: (jobName: string) =>
    buildRedisKey(APP, 'lock', 'enqueue', jobName),
} as const;
