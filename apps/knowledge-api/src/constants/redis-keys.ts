import { buildRedisKey } from '@opden-data-layer/core';

const APP = 'knowledge-api';

export const knowledgeApiRedisKey = {
  reindexLock: () => buildRedisKey(APP, 'lock', 'reindex'),
  reindexLastAt: () => buildRedisKey(APP, 'cache', 'reindex', 'last-at'),
  skillsSha: () => buildRedisKey(APP, 'cache', 'skills', 'sha'),
  skillsEtag: () => buildRedisKey(APP, 'cache', 'skills', 'etag'),
  skillsRefreshLock: () => buildRedisKey(APP, 'lock', 'skills', 'refresh'),
} as const;
