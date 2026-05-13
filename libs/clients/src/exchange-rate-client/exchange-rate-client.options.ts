export interface ExchangeRateClientModuleOptions {
  /** e.g. https://api.exchangerate.host */
  baseUrl?: string;
  /** Optional API key for paid tier */
  accessKey?: string;
  requestTimeoutMs?: number;
}

export const EXCHANGE_RATE_CLIENT_MODULE_OPTIONS =
  'EXCHANGE_RATE_CLIENT_MODULE_OPTIONS';
