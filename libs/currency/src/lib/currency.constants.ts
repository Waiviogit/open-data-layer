/** CoinGecko API ids matching legacy currencies-service */
export const COINGECKO_IDS = ['hive', 'hive_dollar'] as const;

export const VS_CURRENCIES = ['usd', 'btc'] as const;

/** Legacy WAIV diesel pool `_id` in marketpools `pools`. */
export const WAIV_HIVE_DIESEL_POOL_ID = 63;

export const ENGINE_BASE_WAIV = 'WAIV';

export const FIAT_RATE_BASE_USD = 'USD';

/** Target ISO codes for Postgres columns (ordering matches legacy RATE_CURRENCIES). */
export const FIAT_TARGET_CODES = [
  'CAD',
  'EUR',
  'AUD',
  'MXN',
  'GBP',
  'JPY',
  'CNY',
  'RUB',
  'UAH',
  'CHF',
] as const;

/** exchangerate.host quote key → Postgres column key */
export const USD_PAIR_TO_COLUMN: Record<string, keyof FiatColumns> = {
  USDCAD: 'cad',
  USDEUR: 'eur',
  USDAUD: 'aud',
  USDMXN: 'mxn',
  USDGBP: 'gbp',
  USDJPY: 'jpy',
  USDCNY: 'cny',
  USDRUB: 'rub',
  USDUAH: 'uah',
  USDCHF: 'chf',
};

export type FiatColumns = {
  cad: number;
  eur: number;
  aud: number;
  mxn: number;
  gbp: number;
  jpy: number;
  cny: number;
  rub: number;
  uah: number;
  chf: number;
};

export const ZERO_FIAT_ROW: FiatColumns = {
  cad: 0,
  eur: 0,
  aud: 0,
  mxn: 0,
  gbp: 0,
  jpy: 0,
  cny: 0,
  rub: 0,
  uah: 0,
  chf: 0,
};

/** Legacy hive-engine symbols → market pool tokenPair (excluding SWAP.HIVE). */
export const ENGINE_POOL_PAIR_BY_SYMBOL: Record<string, string> = {
  'SWAP.LTC': 'SWAP.HIVE:SWAP.LTC',
  'SWAP.BTC': 'SWAP.HIVE:SWAP.BTC',
  'SWAP.ETH': 'SWAP.HIVE:SWAP.ETH',
  'SWAP.HBD': 'SWAP.HIVE:SWAP.HBD',
};

/** Used to derive SWAP.HIVE / USD cross from pool quantities. */
export const HBD_HIVE_SWAP_POOL = 'SWAP.HIVE:SWAP.HBD';
