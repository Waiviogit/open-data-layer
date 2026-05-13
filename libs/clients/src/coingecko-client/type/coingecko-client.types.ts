/** `/simple/price` row per coin id. */
export type CoinGeckoSimplePriceRow = {
  usd?: number;
  usd_24h_change?: number;
  btc?: number;
  btc_24h_change?: number;
};

export type CoinGeckoSimplePriceResponse = Record<
  string,
  CoinGeckoSimplePriceRow
>;

/** Subset of `/coins/{id}/history` used for backfill. */
export type CoinGeckoHistoryResponse = {
  market_data?: {
    current_price?: { usd?: number; btc?: number };
  };
};
