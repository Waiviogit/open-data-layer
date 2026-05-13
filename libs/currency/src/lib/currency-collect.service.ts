import { Injectable, Logger } from '@nestjs/common';

import {
  CoinGeckoClient,
  ExchangeRateClient,
  HiveEngineClient,
} from '@opden-data-layer/clients';

import {
  COINGECKO_IDS,
  ENGINE_BASE_WAIV,
  FIAT_RATE_BASE_USD,
  FIAT_TARGET_CODES,
  VS_CURRENCIES,
  WAIV_HIVE_DIESEL_POOL_ID,
} from './currency.constants';
import { CurrencyRepository } from './currency.repository';

function utcYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Persist CoinGecko + FX + Hive Engine rates (scheduler ingestion).
 */
@Injectable()
export class CurrencyCollectService {
  private readonly logger = new Logger(CurrencyCollectService.name);

  constructor(
    private readonly currencyRepo: CurrencyRepository,
    private readonly coinGecko: CoinGeckoClient,
    private readonly exchangeRates: ExchangeRateClient,
    private readonly hiveEngine: HiveEngineClient,
  ) {}

  /** Every 5m: CoinGecko simple price snapshot (no Hive Engine WAIV rows). */
  async collectCoinGeckoOrdinary(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();

    const raw = await this.coinGecko.getSimplePrice({
      ids: [...COINGECKO_IDS],
      vsCurrencies: [...VS_CURRENCIES],
    });

    if (!raw) {
      this.logger.warn('collectCoinGeckoOrdinary: no CoinGecko response');
      return;
    }

    const hive = raw.hive ?? {};
    const hbd = raw.hive_dollar ?? {};

    await this.currencyRepo.insertCurrencyStatistic({
      is_daily: false,
      hive_usd: Number(hive.usd ?? 0),
      hive_usd_24h_change: Number(hive.usd_24h_change ?? 0),
      hive_btc: Number(hive.btc ?? 0),
      hive_btc_24h_change: Number(hive.btc_24h_change ?? 0),
      hbd_usd: Number(hbd.usd ?? 0),
      hbd_usd_24h_change: Number(hbd.usd_24h_change ?? 0),
      hbd_btc: Number(hbd.btc ?? 0),
      hbd_btc_24h_change: Number(hbd.btc_24h_change ?? 0),
    });
  }

  /** Every 5m: WAIV diesel pool row; prefers latest CoinGecko ordinary row already in Postgres. */
  async collectHiveEngineOrdinary(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();

    const latestOrd = await this.currencyRepo.getLatestStatistic(false);

    signal.throwIfAborted();

    let hiveUsd =
      typeof latestOrd?.hive_usd === 'number' && Number.isFinite(latestOrd.hive_usd)
        ? latestOrd.hive_usd
        : 0;

    if (!(hiveUsd > 0)) {
      const g = await this.coinGecko.getSimplePrice({
        ids: ['hive'],
        vsCurrencies: ['usd'],
        include24hrChange: false,
      });
      hiveUsd = Number(g?.hive?.usd ?? 0);
    }

    signal.throwIfAborted();

    if (!(hiveUsd > 0)) {
      this.logger.warn('collectHiveEngineOrdinary: could not resolve HIVE/USD');
      return;
    }

    await this.insertWaivOrdinaryFromPools(signal, hiveUsd);
  }

  /** Cron ~00:13 UTC — aggregate previous UTC day's ordinary samples into one daily row. */
  async collectCoinGeckoDaily(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();

    const now = new Date();
    const prevStartDay = startOfUtcDay(now);
    prevStartDay.setUTCDate(prevStartDay.getUTCDate() - 1);
    const prevEnd = startOfUtcDay(now);

    const ymdYesterday = utcYmd(prevStartDay);

    if (
      await this.currencyRepo.hasDailyCurrencyStatisticUtcDate(ymdYesterday)
    ) {
      return;
    }

    const avgRow = await this.currencyRepo.avgOrdinaryStatisticBetween(
      prevStartDay,
      prevEnd,
    );

    signal.throwIfAborted();

    if (!avgRow) {
      this.logger.warn(
        `collectCoinGeckoDaily: no ordinary rows for UTC day ${ymdYesterday}`,
      );
      return;
    }

    await this.currencyRepo.insertCurrencyStatistic({
      is_daily: true,
      hive_usd: avgRow.hive_usd,
      hive_usd_24h_change: avgRow.hive_usd_24h_change,
      hive_btc: avgRow.hive_btc,
      hive_btc_24h_change: avgRow.hive_btc_24h_change,
      hbd_usd: avgRow.hbd_usd,
      hbd_usd_24h_change: avgRow.hbd_usd_24h_change,
      hbd_btc: avgRow.hbd_btc,
      hbd_btc_24h_change: avgRow.hbd_btc_24h_change,
      created_at: new Date(
        Date.UTC(
          prevStartDay.getUTCFullYear(),
          prevStartDay.getUTCMonth(),
          prevStartDay.getUTCDate(),
          12,
        ),
      ),
    });
  }

  /** Daily FX from exchangerate.host (legacy USDCAD-style quotes). */
  async collectFxRatesDaily(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();

    const res = await this.exchangeRates.getLiveRates(FIAT_RATE_BASE_USD, [
      ...FIAT_TARGET_CODES,
    ]);

    signal.throwIfAborted();

    if (!res?.quotes && res?.success === false) {
      this.logger.warn('collectFxRatesDaily: exchangerate response unsuccessful');
      return;
    }

    if (!res?.quotes || Object.keys(res.quotes).length === 0) {
      this.logger.warn('collectFxRatesDaily: no quotes payload');
      return;
    }

    const fiatCols = this.currencyRepo.fiatFromUsdQuotes(res.quotes);
    const today = utcYmd(new Date());

    await this.currencyRepo.upsertDailyCurrencyRates({
      base: FIAT_RATE_BASE_USD,
      date: today,
      ...fiatCols,
    });
  }

  private async insertWaivOrdinaryFromPools(
    signal: AbortSignal,
    hiveUsd: number,
  ): Promise<void> {
    const pool = await this.hiveEngine.findOneMarketPool({
      _id: WAIV_HIVE_DIESEL_POOL_ID,
    });

    signal.throwIfAborted();

    if (!pool?.quotePrice) {
      this.logger.warn('WAIV diesel pool unavailable');
      return;
    }

    const priceInHive = Number.parseFloat(pool.quotePrice);
    if (!Number.isFinite(priceInHive) || priceInHive <= 0) {
      return;
    }

    const today = utcYmd(new Date());

    await this.currencyRepo.insertHiveEngineRate({
      base: ENGINE_BASE_WAIV,
      is_daily: false,
      date: today,
      rate_hive: priceInHive,
      rate_usd: priceInHive * hiveUsd,
      change_24h_hive: null,
      change_24h_usd: null,
    });
  }

  /** Cron ~00:20 UTC — ordinary WAIV aggregate for UTC yesterday + 24h change vs prior daily row. */
  async collectHiveEngineDaily(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();

    const now = startOfUtcDay(new Date());
    const targetPrev = startOfUtcDay(new Date(now.getTime()));
    targetPrev.setUTCDate(targetPrev.getUTCDate() - 1);
    const ymdTarget = utcYmd(targetPrev);

    const comparePrev = startOfUtcDay(new Date(targetPrev.getTime()));
    comparePrev.setUTCDate(comparePrev.getUTCDate() - 1);
    const ymdCompare = utcYmd(comparePrev);

    const avgOrd = await this.currencyRepo.avgOrdinaryHiveRatesForDay({
      base: ENGINE_BASE_WAIV,
      dateIso: ymdTarget,
    });

    signal.throwIfAborted();

    if (!avgOrd) {
      this.logger.warn(
        `collectHiveEngineDaily: no ordinary WAIV rates for ${ymdTarget}`,
      );
      return;
    }

    const prevDaily = await this.currencyRepo.findHiveDailyByBaseAndDate({
      base: ENGINE_BASE_WAIV,
      dateIso: ymdCompare,
    });

    await this.currencyRepo.insertHiveEngineDaily({
      base: ENGINE_BASE_WAIV,
      is_daily: true,
      date: ymdTarget,
      rate_hive: avgOrd.rate_hive,
      rate_usd: avgOrd.rate_usd,
      change_24h_hive: pctChangeAgainstPrevious(
        avgOrd.rate_hive,
        prevDaily?.rate_hive ?? null,
      ),
      change_24h_usd: pctChangeAgainstPrevious(
        avgOrd.rate_usd,
        prevDaily?.rate_usd ?? null,
      ),
    });

    signal.throwIfAborted();
  }
}

function pctChangeAgainstPrevious(
  current: number,
  previous: number | null,
): number | null {
  if (previous == null || !Number.isFinite(previous) || previous === 0) {
    return null;
  }

  const c = Number(current);
  if (!Number.isFinite(c)) {
    return null;
  }

  const result = ((c - previous) / previous) * 100;

  return Number.isFinite(result) ? result : null;
}
