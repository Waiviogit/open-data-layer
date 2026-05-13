import { Injectable, Logger } from '@nestjs/common';

import type { CurrencyStatisticsRow } from '@opden-data-layer/core';
import type { HiveEngineMarketPool } from '@opden-data-layer/clients';
import { HiveClient, HiveEngineClient } from '@opden-data-layer/clients';

import {
  ENGINE_BASE_WAIV,
  ENGINE_POOL_PAIR_BY_SYMBOL,
  HBD_HIVE_SWAP_POOL,
  WAIV_HIVE_DIESEL_POOL_ID,
} from './currency.constants';
import { CurrencyRepository } from './currency.repository';

/** Chart window: days back + whether to read daily aggregates vs ordinary snapshots. */
const CHART_WINDOWS: Record<string, { days: number; useDailyRows: boolean }> = {
  '1d': { days: 1, useDailyRows: false },
  '7d': { days: 7, useDailyRows: false },
  '1m': { days: 31, useDailyRows: true },
  '3m': { days: 93, useDailyRows: true },
  '6m': { days: 186, useDailyRows: true },
  '1y': { days: 372, useDailyRows: true },
  '2y': { days: 744, useDailyRows: true },
  all: { days: 0, useDailyRows: true },
};

const START_PRICE_WAIV_USD = 0.005;
const START_PRICE_WAIV_HIVE = 0.01;

type EngineRates = { HIVE: number; USD: number };

type EnginePoint = {
  dateString: string;
  base: string;
  rates: EngineRates;
  change24h?: EngineRates;
};

type LegacyEngineChartPoint = {
  dateString: string;
  rates: EngineRates;
};

const CHART_KEYS = { all: 'all' } as const;

export type LegacyTokenPrices = {
  usd: number;
  btc: number;
  usd_24h_change: number;
  btc_24h_change: number;
};

type SimplePriceTokenRow = {
  usd: number;
  usd_24h_change: number;
  btc: number;
  btc_24h_change: number;
};

type SimplePricePayload = {
  hive: SimplePriceTokenRow;
  hive_dollar: SimplePriceTokenRow;
};

@Injectable()
export class CurrencyQueryService {
  private readonly logger = new Logger(CurrencyQueryService.name);

  constructor(
    private readonly repo: CurrencyRepository,
    private readonly hive: HiveClient,
    private readonly hiveEngine: HiveEngineClient,
  ) {}

  async marketInfo(params: {
    idsComma?: string | undefined;
    currenciesComma?: string | undefined;
  }): Promise<{
    current: Record<string, unknown>;
    weekly: Record<string, unknown>[];
  }> {
    void params.idsComma;
    void params.currenciesComma;

    const lastOrd = await this.repo.getLatestStatistic(false);

    let cg: SimplePricePayload;

    if (lastOrd && Number(lastOrd.hive_usd) > 0) {
      cg = simplePricePayloadFromPgOrdinary(lastOrd);
    } else {
      const hbdHint =
        lastOrd && Number(lastOrd.hbd_usd) > 0 ? Number(lastOrd.hbd_usd) : 1;
      const fromMedian = hiveSimplePricesFromMedian(
        await this.hive.getCurrentMedianHistoryPrice(),
        hbdHint,
      );

      if (!fromMedian) {
        if (lastOrd) {
          cg = simplePricePayloadFromPgOrdinary(lastOrd);
        } else {
          this.logger.warn(
            'marketInfo: no currency_statistics and Hive median unavailable',
          );
          return { current: {}, weekly: [] };
        }
      } else {
        cg = fromMedian;
        if (lastOrd) {
          enrichCgFromPgSecondary(cg, lastOrd);
        }
      }
    }

    const now = new Date();

    const current: Record<string, unknown> = {
      hive: mapCoingeckoBlock(cg.hive),
      hive_dollar: mapCoingeckoBlock(cg.hive_dollar),
      type: 'ordinaryData',
      createdAt: now,
      updatedAt: now,
    };

    const dailiesDesc = await this.repo.listDailyStatisticsLimitDesc(7);

    /** Oldest-first for weekly tail (excluding current handled separately). */
    const dailiesAscChrono = [...dailiesDesc].reverse();

    const weekly: Record<string, unknown>[] = dailiesAscChrono.map((row) =>
      dailyDocFromPgRow(row),
    );

    weekly.unshift(current);

    return { current, weekly };
  }

  legacyRateLatest(baseStr: string, symbolsComma: string) {
    return this.repo.getLegacyLatestRates({
      base: baseStr.toUpperCase(),
      symbolsComma,
    });
  }

  async engineRates(baseToken = ENGINE_BASE_WAIV) {
    const liveRates = await readLiveWaivRates(
      this.hiveEngine,
      this.hive,
      this.repo,
    );

    let snapshot: EnginePoint | null =
      liveRates &&
      ({
        dateString: utcYmd(new Date()),
        base: baseToken,
        rates: { HIVE: liveRates.rateHive, USD: liveRates.rateUsd },
      } as EnginePoint);

    if (!snapshot) {
      const last = (
        await this.repo.listHiveEngineRates({
          base: baseToken,
          isDaily: false,
          limit: 1,
          orderAsc: false,
        })
      ).at(0);

      snapshot = last
        ? {
            dateString: String(last.date),
            base: baseToken,
            rates: {
              HIVE: Number(last.rate_hive),
              USD: Number(last.rate_usd),
            },
          }
        : null;
    }

    if (!snapshot) {
      return { current: null, weekly: [] as Record<string, unknown>[], error: 'no_data' };
    }

    const sinceDaily = utcYmdAddUtcDays(utcYmd(new Date()), -6);

    const weeklyRows = (
      await this.repo.listHiveEngineRates({
        base: baseToken,
        isDaily: true,
        sinceDateInclusive: sinceDaily,
        limit: undefined,
        orderAsc: false,
      })
    ).map(
      (r): EnginePoint => ({
        base: baseToken,
        dateString: String(r.date),
        rates: {
          HIVE: Number(r.rate_hive),
          USD: Number(r.rate_usd),
        },
      }),
    );

    const tail = weeklyRows.at(-1);

    const current = Object.assign(snapshot, {
      change24h: computeEnginePctChange(snapshot.rates, tail?.rates ?? null),
    });

    const weeklyBodies: Record<string, unknown>[] = [...weeklyRows];
    weeklyBodies.unshift(current);

    return { current, weekly: weeklyBodies };
  }

  async engineCurrent(baseToken = ENGINE_BASE_WAIV): Promise<
    Record<string, number> | undefined
  > {
    const liveRates = await readLiveWaivRates(
      this.hiveEngine,
      this.hive,
      this.repo,
    );

    if (liveRates && baseToken === ENGINE_BASE_WAIV) {
      return { HIVE: liveRates.rateHive, USD: liveRates.rateUsd };
    }

    const lastRow = (
      await this.repo.listHiveEngineRates({
        base: baseToken,
        isDaily: false,
        limit: 1,
        orderAsc: false,
      })
    ).at(0);

    return lastRow
      ? { HIVE: Number(lastRow.rate_hive), USD: Number(lastRow.rate_usd) }
      : undefined;
  }

  async engineChart(periodRaw: string, baseToken = ENGINE_BASE_WAIV) {
    const win = normalizeChartWindow(periodRaw);

    const waivUsdLive = await readLiveWaivRates(
      this.hiveEngine,
      this.hive,
      this.repo,
    );

    const fallbackHead = (
      await this.repo.listHiveEngineRates({
        base: baseToken,
        isDaily: false,
        limit: 1,
        orderAsc: false,
      })
    ).at(0);

    const headPt: LegacyEngineChartPoint =
      waivUsdLive && baseToken === ENGINE_BASE_WAIV
        ? {
            dateString: utcYmd(new Date()),
            rates: {
              HIVE: waivUsdLive.rateHive,
              USD: waivUsdLive.rateUsd,
            },
          }
        : fallbackHead
          ? {
              dateString: String(fallbackHead.date),
              rates: {
                HIVE: Number(fallbackHead.rate_hive),
                USD: Number(fallbackHead.rate_usd),
              },
            }
          : {
              dateString: utcYmd(new Date()),
              rates: { HIVE: 0, USD: 0 },
            };

    const sinceIso =
      win.days <= 0
        ? undefined
        : utcYmdAddUtcDays(utcYmd(new Date()), -win.days);

    const bulk = (
      await this.repo.listHiveEngineRates({
        base: baseToken,
        isDaily: win.useDailyRows,
        sinceDateInclusive: sinceIso,
        limit: undefined,
        orderAsc: true,
      })
    ).map(
      (r): LegacyEngineChartPoint => ({
        dateString: String(r.date),
        rates: {
          HIVE: Number(r.rate_hive),
          USD: Number(r.rate_usd),
        },
      }),
    );

    const mergedSeen = new Set<string>();

    mergedSeen.add(headPt.dateString);

    /** Live head first, oldest tail last after sort desc. */

    bulk.sort((pointA, pointB) => pointA.dateString.localeCompare(pointB.dateString));

    const mergedDescending: LegacyEngineChartPoint[] = [headPt];

    for (const pointBulk of [...bulk].reverse()) {
      if (!mergedSeen.has(pointBulk.dateString)) {
        mergedSeen.add(pointBulk.dateString);

        mergedDescending.push(pointBulk);
      }
    }

    mergedDescending.sort((pointA, pointB) =>
      pointB.dateString.localeCompare(pointA.dateString),
    );

    let lowUsd = Math.min(
      ...mergedDescending.map((each) => Number(each.rates.USD ?? 0)),
      Number.POSITIVE_INFINITY,
    );

    if (!(Number.isFinite(lowUsd))) {
      lowUsd = START_PRICE_WAIV_USD;
    }

    const earliest = mergedDescending.at(-1);
    const headPoint = mergedDescending[0];
    const change =
      earliest && headPoint
        ? {
            HIVE: pctBetween(
              headPoint.rates.HIVE,
              earliest.rates.HIVE,
              START_PRICE_WAIV_HIVE,
            ),
            USD: pctBetween(
              headPoint.rates.USD,
              earliest.rates.USD,
              START_PRICE_WAIV_USD,
            ),
          }
        : { HIVE: 0, USD: 0 };

    let highUsd = Math.max(
      ...mergedDescending.map((each) => Number(each.rates.USD ?? 0)),
    );

    if (!(highUsd > 0) || !(Number.isFinite(highUsd))) {
      highUsd = START_PRICE_WAIV_USD;
    }

    return {
      result: mergedDescending,
      change,

      lowUSD:
        normalizeChartRaw(periodRaw) === CHART_KEYS.all
          ? START_PRICE_WAIV_USD
          : Number.isFinite(lowUsd)
            ? lowUsd
            : START_PRICE_WAIV_USD,

      highUSD: highUsd,
    };
  }

  async enginePoolsUsdCsv(csvSymbols: string): Promise<
    Array<{ symbol: string; USD: number }>
  > {
    const symbols = [...new Set(csvSymbols.split(',').map((s) => s.trim()))].filter(
      Boolean,
    );

    if (symbols.length === 0) {
      return [];
    }

    const tokenPairs: string[] = [HBD_HIVE_SWAP_POOL];
    for (const sym of symbols) {
      const p = ENGINE_POOL_PAIR_BY_SYMBOL[sym];
      if (p) {
        tokenPairs.push(p);
      }
    }

    const poolsFetched =
      tokenPairs.length > 0
        ? await this.hiveEngine.findMarketPools({
            query: { tokenPair: { $in: [...new Set(tokenPairs)] } },
          })
        : [];

    const pairLookup = pairMapFromPools(poolsFetched);

    const hbdPool = poolsFetched.find((p) => p.tokenPair === HBD_HIVE_SWAP_POOL);

    const hiveUsd = await hiveUsdFromHbdSwapOrFallback(
      hbdPool,
      this.repo,
      this.hive,
    );

    const results: Array<{ symbol: string; USD: number }> = [];

    for (const sym of symbols) {
      if (sym === 'SWAP.HIVE') {
        results.push({ symbol: sym, USD: hiveUsd });
        continue;
      }

      const pairNeeded = ENGINE_POOL_PAIR_BY_SYMBOL[sym];

      if (!pairNeeded) {
        continue;
      }

      let poolRow = pairLookup.get(pairNeeded);
      poolRow ||= (
        await this.hiveEngine.findMarketPools({
          query: { tokenPair: pairNeeded },
          limit: 1,
        })
      ).at(0);

      if (!poolRow) {
        continue;
      }

      const swapHiveLikeBaseToken = poolRow.tokenPair.split(':')[0] ?? '';
      const swapHiveLikeMatchesSymInput = swapHiveLikeBaseToken === sym;

      const scaledUsdHiveCross = swapHiveLikeMatchesSymInput

        ? Number.parseFloat(poolRow.basePrice ?? '0') * hiveUsd

        : Number.parseFloat(poolRow.quotePrice ?? '0') * hiveUsd;


      results.push({
        symbol: sym,
        USD: scaledUsdHiveCross,
      });
    }


    return results;


  }



}


function utcYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function utcYmdAddUtcDays(ymd: string, deltaDays: number): string {
  const [yStr, moStr = '1', dStr = '1'] = ymd.split('-');
  const ms =
    Date.UTC(Number(yStr), Number(moStr) - 1, Number(dStr)) +
    deltaDays * 86_400_000;
  return utcYmd(new Date(ms));
}

function normalizeChartRaw(raw: string): string {
  return raw.trim().toLowerCase();
}

function normalizeChartWindow(
  rawPeriod: string,
): { days: number; useDailyRows: boolean } {
  const key = normalizeChartRaw(rawPeriod);
  const fallback = CHART_WINDOWS['1m'];
  if (!fallback) {
    throw new Error('currency-query: chart window fallback 1m is missing');
  }
  return CHART_WINDOWS[key] ?? fallback;
}


function simplePricePayloadFromPgOrdinary(
  row: CurrencyStatisticsRow,
): SimplePricePayload {
  return {
    hive: {
      usd: Number(row.hive_usd),
      usd_24h_change: Number(row.hive_usd_24h_change),
      btc: Number(row.hive_btc),
      btc_24h_change: Number(row.hive_btc_24h_change),
    },
    hive_dollar: {
      usd: Number(row.hbd_usd),
      usd_24h_change: Number(row.hbd_usd_24h_change),
      btc: Number(row.hbd_btc),
      btc_24h_change: Number(row.hbd_btc_24h_change),
    },
  };
}

function mapCoingeckoBlock(
  block: SimplePriceTokenRow | undefined,
): LegacyTokenPrices {
  if (!block) {
    return {
      usd: 0,
      btc: 0,
      usd_24h_change: 0,
      btc_24h_change: 0,
    };
  }
  return {
    usd: Number(block.usd ?? 0),
    btc: Number(block.btc ?? 0),
    usd_24h_change: Number(block.usd_24h_change ?? 0),
    btc_24h_change: Number(block.btc_24h_change ?? 0),
  };
}

function parseHiveAssetAmount(
  asset: string,
): { amount: number; symbol: string } | null {
  const m = asset.trim().match(/^([\d.]+)\s+([A-Za-z.]+)$/);
  if (!m) {
    return null;
  }
  const amount = Number(m[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }
  const sym = m[2];
  if (!sym) {
    return null;
  }
  return { amount, symbol: sym.toUpperCase() };
}

function hiveSimplePricesFromMedian(
  median: { base: string; quote: string } | undefined,
  hbdUsd: number,
): SimplePricePayload | null {
  if (!median?.base || !median.quote) {
    return null;
  }
  const baseAmt = parseHiveAssetAmount(median.base);
  const quoteAmt = parseHiveAssetAmount(median.quote);
  if (!baseAmt || !quoteAmt) {
    return null;
  }
  const effectiveHbdUsd = hbdUsd > 0 ? hbdUsd : 1;

  if (baseAmt.symbol !== 'HBD' || quoteAmt.symbol !== 'HIVE') {
    return null;
  }

  const hbdPerHive = baseAmt.amount / quoteAmt.amount;
  if (!(hbdPerHive > 0)) {
    return null;
  }

  const hiveUsdSpot = hbdPerHive * effectiveHbdUsd;

  return {
    hive: {
      usd: hiveUsdSpot,
      usd_24h_change: 0,
      btc: 0,
      btc_24h_change: 0,
    },
    hive_dollar: {
      usd: effectiveHbdUsd,
      usd_24h_change: 0,
      btc: 0,
      btc_24h_change: 0,
    },
  };
}

function enrichCgFromPgSecondary(
  cg: SimplePricePayload,
  row: CurrencyStatisticsRow,
): void {
  cg.hive.btc = Number(row.hive_btc ?? 0);
  cg.hive.btc_24h_change = Number(row.hive_btc_24h_change ?? 0);
  cg.hive.usd_24h_change = Number(row.hive_usd_24h_change ?? 0);
  cg.hive_dollar.btc = Number(row.hbd_btc ?? 0);
  cg.hive_dollar.btc_24h_change = Number(row.hbd_btc_24h_change ?? 0);
  cg.hive_dollar.usd_24h_change = Number(row.hbd_usd_24h_change ?? 0);
  if (Number(row.hbd_usd ?? 0) > 0) {
    cg.hive_dollar.usd = Number(row.hbd_usd);
  }
}

function dailyDocFromPgRow(row: CurrencyStatisticsRow): Record<string, unknown> {
  const payload = simplePricePayloadFromPgOrdinary(row);
  return {
    hive: mapCoingeckoBlock(payload.hive),
    hive_dollar: mapCoingeckoBlock(payload.hive_dollar),
    type: 'dailyData',
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}

async function readLiveWaivRates(
  hiveEngine: HiveEngineClient,
  hive: HiveClient,
  repo: CurrencyRepository,
): Promise<{ rateHive: number; rateUsd: number } | null> {
  const lastStat = await repo.getLatestStatistic(false);
  let hiveUsd = Number(lastStat?.hive_usd ?? 0);
  if (!(hiveUsd > 0)) {
    const hbdHint =
      lastStat && Number(lastStat.hbd_usd) > 0 ? Number(lastStat.hbd_usd) : 1;
    const shaped = hiveSimplePricesFromMedian(
      await hive.getCurrentMedianHistoryPrice(),
      hbdHint,
    );
    hiveUsd = shaped ? shaped.hive.usd : 0;
  }

  const poolRow = await hiveEngine.findOneMarketPool({
    _id: WAIV_HIVE_DIESEL_POOL_ID,
  });

  if (!poolRow?.quotePrice) {
    return null;
  }

  const rateHive = Number.parseFloat(poolRow.quotePrice);
  if (!(rateHive > 0) || !Number.isFinite(rateHive) || !(hiveUsd > 0)) {
    return null;
  }

  return { rateHive, rateUsd: rateHive * hiveUsd };
}

function computeEnginePctChange(
  current: EngineRates,
  anchor: EngineRates | null,
): EngineRates {
  if (!anchor) {
    return { HIVE: 0, USD: 0 };
  }
  return {
    HIVE: pctDelta(current.HIVE, anchor.HIVE),
    USD: pctDelta(current.USD, anchor.USD),
  };
}

function pctDelta(curr: number, prev: number): number {
  if (!prev || !Number.isFinite(prev) || prev === 0) {
    return 0;
  }
  const r = ((curr - prev) / prev) * 100;
  return Number.isFinite(r) ? r : 0;
}

function pctBetween(
  currentVal: number,
  olderVal: number,
  olderFallbackVal: number,
): number {
  const pickPrev =
    Number.isFinite(olderVal) && olderVal !== 0 ? olderVal : olderFallbackVal;
  return pctDelta(currentVal, pickPrev);
}

async function hiveUsdFromHbdSwapOrFallback(
  hbdSwap: HiveEngineMarketPool | undefined,
  repo: CurrencyRepository,
  hive: HiveClient,
): Promise<number> {
  const stat = await repo.getLatestStatistic(false);
  let hiveUsd = Number(stat?.hive_usd ?? 0);
  if (!(hiveUsd > 0)) {
    const hbdHint =
      stat && Number(stat.hbd_usd) > 0 ? Number(stat.hbd_usd) : 1;
    const shaped = hiveSimplePricesFromMedian(
      await hive.getCurrentMedianHistoryPrice(),
      hbdHint,
    );
    hiveUsd = shaped ? shaped.hive.usd : 0;
  }

  const hbdUsd = Number(stat?.hbd_usd ?? 0) || 1;

  if (!hbdSwap?.baseQuantity || !hbdSwap?.quoteQuantity) {
    return hiveUsd;
  }

  const viaPool =
    (Number.parseFloat(hbdSwap.quoteQuantity) * hbdUsd) /
    Number.parseFloat(hbdSwap.baseQuantity);

  if (Number.isFinite(viaPool) && viaPool > 0) {
    hiveUsd = viaPool;
  }

  return hiveUsd;
}

function pairMapFromPools(
  pools: HiveEngineMarketPool[],
): Map<string, HiveEngineMarketPool> {
  return new Map(pools.map((p) => [p.tokenPair, p]));
}

