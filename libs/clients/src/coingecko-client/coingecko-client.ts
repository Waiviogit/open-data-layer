import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  COINGECKO_CLIENT_MODULE_OPTIONS,
  type CoinGeckoClientModuleOptions,
} from './coingecko-client.options';
import type { CoinGeckoClientInterface } from './interface';
import type {
  CoinGeckoHistoryResponse,
  CoinGeckoSimplePriceResponse,
} from './type';

const DEFAULT_BASE = 'https://api.coingecko.com/api/v3';
const DEFAULT_TIMEOUT_MS = 12_000;

function coinGeckoApiKeyHeaders(
  baseUrl: string,
  apiKey: string | undefined,
): Record<string, string> {
  if (!apiKey?.trim()) {
    return {};
  }
  const key = apiKey.trim();
  const isPro = /pro-api\.coingecko\.com/i.test(baseUrl);
  return isPro
    ? { 'x-cg-pro-api-key': key }
    : { 'x-cg-demo-api-key': key };
}

@Injectable()
export class CoinGeckoClient implements CoinGeckoClientInterface {
  private readonly logger = new Logger(CoinGeckoClient.name);

  constructor(
    @Inject(COINGECKO_CLIENT_MODULE_OPTIONS)
    private readonly options: CoinGeckoClientModuleOptions,
  ) {}

  private baseUrl(): string {
    return (this.options.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '');
  }

  private timeoutMs(): number {
    return this.options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async getSimplePrice(params: {
    ids: string[];
    vsCurrencies: string[];
    include24hrChange?: boolean;
  }): Promise<CoinGeckoSimplePriceResponse | undefined> {
    if (params.ids.length === 0 || params.vsCurrencies.length === 0) {
      return {};
    }
    const q = new URLSearchParams();
    q.set('ids', params.ids.join(','));
    q.set('vs_currencies', params.vsCurrencies.join(','));
    if (params.include24hrChange !== false) {
      q.set('include_24hr_change', 'true');
    }
    const url = `${this.baseUrl()}/simple/price?${q.toString()}`;
    return this.getJson<CoinGeckoSimplePriceResponse>(url);
  }

  async getCoinHistory(
    id: string,
    date: string,
  ): Promise<CoinGeckoHistoryResponse | undefined> {
    const q = new URLSearchParams();
    q.set('date', date);
    q.set('localization', 'false');
    const url = `${this.baseUrl()}/coins/${encodeURIComponent(id)}/history?${q.toString()}`;
    return this.getJson<CoinGeckoHistoryResponse>(url);
  }

  private async getJson<T>(url: string): Promise<T | undefined> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs());
    const auth = coinGeckoApiKeyHeaders(this.baseUrl(), this.options.apiKey);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json', ...auth },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`CoinGecko HTTP ${res.status}: ${text.slice(0, 200)}`);
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
