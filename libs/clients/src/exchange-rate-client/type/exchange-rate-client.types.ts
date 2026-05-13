/** Typical `live` response subset. */
export type ExchangeRateLiveResponse = {
  success?: boolean;
  /** e.g. `{ USDCAD: 1.35, USDEUR: 0.92 }` when source is USD */
  quotes?: Record<string, number>;
  error?: { code?: number; type?: string; info?: string };
};

export type ExchangeRateTimeSeriesResponse = {
  success?: boolean;
  /** `YYYY-MM-DD` -> `{ USDCAD: n, ... }` */
  quotes?: Record<string, Record<string, number>>;
  error?: { code?: number; type?: string; info?: string };
};
