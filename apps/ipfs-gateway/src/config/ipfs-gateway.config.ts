import { validateIpfsGatewayEnv } from './env.validation';

export default () => {
  const env = validateIpfsGatewayEnv(
    process.env as unknown as Record<string, unknown>,
  );
  const peerUrls =
    env.IPFS_PEER_URLS?.split(',')
      .map((u) => u.trim())
      .filter(Boolean) ?? [];

  return {
    port: env.PORT,
    ipfs: {
      apiUrl: env.IPFS_API_URL,
      gatewayUrl: env.IPFS_GATEWAY_URL,
    },
    peers: {
      urls: peerUrls,
      syncIntervalMs: env.PIN_SYNC_INTERVAL_MS,
    },
  };
};
