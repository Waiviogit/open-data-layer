import * as path from 'node:path';
import { validateKnowledgeApiEnv } from './env.validation';

export default () => {
  const env = validateKnowledgeApiEnv(
    process.env as unknown as Record<string, unknown>,
  );
  return {
    port: env.PORT,
    postgres: {
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      database: env.POSTGRES_DATABASE,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      poolMax: env.POSTGRES_POOL_MAX,
    },
    redis: {
      uri: env.REDIS_URI,
    },
    knowledge: {
      allowReindex: env.KNOWLEDGE_ALLOW_REINDEX ?? false,
      startupReindex: env.KNOWLEDGE_STARTUP_REINDEX ?? false,
      reindexMinIntervalSec: env.KNOWLEDGE_REINDEX_MIN_INTERVAL_SEC,
      reindexLockTtlSec: env.KNOWLEDGE_REINDEX_LOCK_TTL_SEC,
      writeAgentRoutes: env.KNOWLEDGE_WRITE_AGENT_ROUTES ?? false,
      workspaceRoot:
        env.KNOWLEDGE_WORKSPACE_ROOT?.trim() ||
        path.resolve(process.cwd()),
      skillsRemoteEnabled: env.KNOWLEDGE_SKILLS_REMOTE_ENABLED ?? false,
      skillsRepo: env.KNOWLEDGE_SKILLS_REPO,
      skillsBranch: env.KNOWLEDGE_SKILLS_BRANCH,
      skillsSnapshotDir:
        env.KNOWLEDGE_SKILLS_SNAPSHOT_DIR?.trim() ||
        path.join(
          env.KNOWLEDGE_WORKSPACE_ROOT?.trim() || path.resolve(process.cwd()),
          'vendor',
          'skills',
        ),
      skillsRefreshIntervalSec: env.KNOWLEDGE_SKILLS_REFRESH_INTERVAL_SEC,
      githubToken: env.KNOWLEDGE_GITHUB_TOKEN?.trim() || undefined,
    },
  };
};
