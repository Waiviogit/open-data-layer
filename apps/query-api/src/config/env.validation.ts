import { z } from 'zod';

export const queryApiConfigSchema = z.object({
  REDIS_URI: z.string().optional().default('redis://localhost:6379'),
  POSTGRES_HOST: z.string().min(1).optional().default('localhost'),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  POSTGRES_DATABASE: z.string().min(1).optional().default('odl'),
  POSTGRES_USER: z.string().min(1).optional().default('postgres'),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_POOL_MAX: z.coerce.number().optional().default(10),
});

export type QueryApiConfig = z.infer<typeof queryApiConfigSchema>;

export function validateQueryApi(
  config: Record<string, unknown>,
): QueryApiConfig {
  const result = queryApiConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data;
}
