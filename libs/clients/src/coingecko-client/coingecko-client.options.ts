export interface CoinGeckoClientModuleOptions {
  /** e.g. https://api.coingecko.com/api/v3 */
  baseUrl?: string;
  /** Pro base URL → `x-cg-pro-api-key`; otherwise keyed Demo/public API → `x-cg-demo-api-key`. */
  apiKey?: string;
  requestTimeoutMs?: number;
}

export const COINGECKO_CLIENT_MODULE_OPTIONS =
  'COINGECKO_CLIENT_MODULE_OPTIONS';
