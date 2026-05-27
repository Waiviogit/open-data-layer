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
} as const;
