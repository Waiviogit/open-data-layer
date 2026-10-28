import { z } from 'zod';

const boolEnv = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

export const knowledgeApiConfigSchema = z.object({
  PORT: z.coerce.number().optional().default(7400),
  POSTGRES_HOST: z.string().min(1).optional().default('localhost'),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  POSTGRES_DATABASE: z.string().min(1).optional().default('odl'),
  POSTGRES_USER: z.string().min(1).optional().default('postgres'),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_POOL_MAX: z.coerce.number().optional().default(10),
  REDIS_URI: z.string().optional().default('redis://localhost:6379'),
  KNOWLEDGE_ALLOW_REINDEX: boolEnv,
  KNOWLEDGE_STARTUP_REINDEX: boolEnv,
  KNOWLEDGE_REINDEX_MIN_INTERVAL_SEC: z.coerce
    .number()
    .int()
    .min(60)
    .optional()
    .default(300),
  KNOWLEDGE_REINDEX_LOCK_TTL_SEC: z.coerce
    .number()
    .int()
    .min(60)
    .optional()
    .default(600),
  KNOWLEDGE_WRITE_AGENT_ROUTES: boolEnv,
  KNOWLEDGE_WORKSPACE_ROOT: z.string().optional(),
  KNOWLEDGE_SKILLS_REMOTE_ENABLED: boolEnv,
  KNOWLEDGE_SKILLS_REPO: z
    .string()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
    .optional()
    .default('Waiviogit/skills'),
  KNOWLEDGE_SKILLS_BRANCH: z.string().min(1).optional().default('master'),
  KNOWLEDGE_SKILLS_SNAPSHOT_DIR: z.string().optional(),
  KNOWLEDGE_SKILLS_REFRESH_INTERVAL_SEC: z.coerce
    .number()
    .int()
    .min(60)
    .optional()
    .default(300),
  KNOWLEDGE_GITHUB_TOKEN: z.string().optional(),
});

export type KnowledgeApiEnv = z.infer<typeof knowledgeApiConfigSchema>;

export function validateKnowledgeApiEnv(
  config: Record<string, unknown>,
): KnowledgeApiEnv {
  const result = knowledgeApiConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data;
}
