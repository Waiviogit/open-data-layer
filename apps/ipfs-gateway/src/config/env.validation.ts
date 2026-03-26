import { z } from 'zod';

export const ipfsGatewayConfigSchema = z.object({
  PORT: z.coerce.number().optional().default(3001),
  IPFS_API_URL: z.string().url().default('http://localhost:5001'),
  IPFS_GATEWAY_URL: z.string().url().optional(),
  /** Comma-separated peer ipfs-gateway base URLs (e.g. http://host:3001/ipfs-gateway) */
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
