import type {
  ExchangeRateLiveResponse,
  ExchangeRateTimeSeriesResponse,
} from '../type';

export interface ExchangeRateClientInterface {
  /**
   * Fiat quotes from a base (e.g. USD) to ISO currency codes.
   * @param source Base currency, e.g. `USD`
   * @param currencies Target codes, e.g. `['CAD','EUR']`
   */
  getLiveRates(
    source: string,
    currencies: string[],
  ): Promise<ExchangeRateLiveResponse | undefined>;

  getTimeSeries(params: {
    startDate: string;
    endDate: string;
    source: string;
    currencies: string[];
  }): Promise<ExchangeRateTimeSeriesResponse | undefined>;
}
