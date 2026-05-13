import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EXCHANGE_RATE_CLIENT_MODULE_OPTIONS,
  type ExchangeRateClientModuleOptions,
} from './exchange-rate-client.options';
import type { ExchangeRateClientInterface } from './interface';
import type {
  ExchangeRateLiveResponse,
  ExchangeRateTimeSeriesResponse,
} from './type';

const DEFAULT_BASE = 'https://api.exchangerate.host';
const DEFAULT_TIMEOUT_MS = 12_000;

@Injectable()
export class ExchangeRateClient implements ExchangeRateClientInterface {
  private readonly logger = new Logger(ExchangeRateClient.name);

  constructor(
    @Inject(EXCHANGE_RATE_CLIENT_MODULE_OPTIONS)
    private readonly options: ExchangeRateClientModuleOptions,
  ) {}

  private baseUrl(): string {
    return (this.options.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '');
  }

  private timeoutMs(): number {
    return this.options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async getLiveRates(
    source: string,
    currencies: string[],
  ): Promise<ExchangeRateLiveResponse | undefined> {
    if (currencies.length === 0) {
      return { success: true, quotes: {} };
    }
    const q = new URLSearchParams();
    q.set('source', source.toUpperCase());
    q.set('currencies', currencies.map((c) => c.toUpperCase()).join(','));
    if (this.options.accessKey) {
      q.set('access_key', this.options.accessKey);
    }
    const url = `${this.baseUrl()}/live?${q.toString()}`;
    return this.getJson<ExchangeRateLiveResponse>(url);
  }

  async getTimeSeries(params: {
    startDate: string;
    endDate: string;
    source: string;
    currencies: string[];
  }): Promise<ExchangeRateTimeSeriesResponse | undefined> {
    const q = new URLSearchParams();
    q.set('start_date', params.startDate);
    q.set('end_date', params.endDate);
    q.set('source', params.source.toUpperCase());
    q.set(
      'currencies',
      params.currencies.map((c) => c.toUpperCase()).join(','),
    );
    if (this.options.accessKey) {
      q.set('access_key', this.options.accessKey);
    }
    const url = `${this.baseUrl()}/timeseries?${q.toString()}`;
    return this.getJson<ExchangeRateTimeSeriesResponse>(url);
  }

  private async getJson<T>(url: string): Promise<T | undefined> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(
          `ExchangeRate HTTP ${res.status}: ${text.slice(0, 200)}`,
        );
        return undefined;
      }
      return (await res.json()) as T;
    } catch (e) {
      this.logger.error(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
