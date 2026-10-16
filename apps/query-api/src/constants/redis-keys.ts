import { buildRedisKey } from '@opden-data-layer/core';

const APP = 'query-api';

export const redisKey = {
  discoverTagCategories: (objectType: string) =>
    buildRedisKey(APP, 'cache', 'tag-categories', objectType),
  listItemCount: (parentObjectId: string, listRefId: string) =>
    buildRedisKey(APP, 'cache', 'list-count', parentObjectId, listRefId),
  objectRefExpansion: (
    parentObjectId: string,
    locale: string,
    viewerSegment: string,
    refIdsSegment: string,
  ) =>
    buildRedisKey(
      APP,
      'cache',
      'obj-refs',
      parentObjectId,
      locale,
      viewerSegment,
      refIdsSegment,
    ),
  postRewardWaivHiveRate: () =>
    buildRedisKey(APP, 'cache', 'post-reward', 'waiv-hive-usd'),
  postRewardFiatRates: (base: string) =>
    buildRedisKey(APP, 'cache', 'post-reward', 'fiat', base),
  hiveGlobalProperties: () =>
    buildRedisKey(APP, 'cache', 'hive', 'dynamic-global-properties'),
  hiveRewardFund: () => buildRedisKey(APP, 'cache', 'reward-fund', 'hive'),
  hiveAccount: (accountName: string) =>
    buildRedisKey(APP, 'cache', 'hive', 'account', accountName.trim().toLowerCase()),
  waivRewardPool: () => buildRedisKey(APP, 'cache', 'waiv', 'reward-pool'),
  waivDieselPool: () => buildRedisKey(APP, 'cache', 'waiv', 'diesel-pool'),
  waivGeneratedReportLock: (reportId: string) =>
    buildRedisKey(APP, 'lock', 'waiv-generated-report', reportId),
} as const;
