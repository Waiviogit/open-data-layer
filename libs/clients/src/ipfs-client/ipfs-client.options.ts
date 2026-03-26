export interface IpfsClientModuleOptions {
  /** Kubo HTTP API base URL, e.g. http://localhost:5001 */
  apiUrl: string;
  /** Optional public gateway base for building URLs returned to clients */
  gatewayUrl?: string;
}

export const IPFS_CLIENT_MODULE_OPTIONS = 'IPFS_CLIENT_MODULE_OPTIONS';
