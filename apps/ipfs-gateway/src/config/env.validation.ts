import { z } from 'zod';

export const ipfsGatewayConfigSchema = z.object({
  /** Must match auth-api JWT_SECRET for access token verification. */
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().optional().default(7300),
  IPFS_API_URL: z.string().url().default('http://localhost:5001'),
  IPFS_GATEWAY_URL: z.string().url().optional(),
  /** Comma-separated peer ipfs-gateway base URLs (e.g. http://host:7300/ipfs-gateway) */
  IPFS_PEER_URLS: z.string().optional(),
  PIN_SYNC_INTERVAL_MS: z.coerce.number().optional().default(300_000),
});

export type IpfsGatewayEnv = z.infer<typeof ipfsGatewayConfigSchema>;

export function validateIpfsGatewayEnv(
  config: Record<string, unknown>,
): IpfsGatewayEnv {
  const result = ipfsGatewayConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data;
}
