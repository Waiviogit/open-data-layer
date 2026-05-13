import type {
  CoinGeckoHistoryResponse,
  CoinGeckoSimplePriceResponse,
} from '../type';

export interface CoinGeckoClientInterface {
  getSimplePrice(params: {
    ids: string[];
    vsCurrencies: string[];
    include24hrChange?: boolean;
  }): Promise<CoinGeckoSimplePriceResponse | undefined>;

  /**
   * @param id CoinGecko id, e.g. `hive`
   * @param date `dd-mm-yyyy` (CoinGecko format)
   */
  getCoinHistory(
    id: string,
    date: string,
  ): Promise<CoinGeckoHistoryResponse | undefined>;
}
