import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type {
  CurrencyRatesRow,
  CurrencyStatisticsRow,
  HiveEngineRatesRow,
  NewCurrencyRatesRow,
  NewCurrencyStatisticsRow,
  NewHiveEngineRatesRow,
  OdlDatabase,
} from '@opden-data-layer/core';

import {
  FIAT_TARGET_CODES,
  type FiatColumns,
  USD_PAIR_TO_COLUMN,
  ZERO_FIAT_ROW,
} from './currency.constants';
import { CURRENCY_DATABASE } from './currency.tokens';

const USD_PAIR_TO_COLUMN_LOOKUP = USD_PAIR_TO_COLUMN as Record<
  string,
  keyof FiatColumns
>;

function isoToColumn(isoUpper: string): keyof FiatColumns | undefined {
  return USD_PAIR_TO_COLUMN_LOOKUP[`USD${isoUpper}`];
}

@Injectable()
export class CurrencyRepository {
  private readonly logger = new Logger(CurrencyRepository.name);

  constructor(
    @Inject(CURRENCY_DATABASE)
    private readonly db: Kysely<OdlDatabase>,
  ) {}

  async insertCurrencyStatistic(
    row: Omit<NewCurrencyStatisticsRow, 'id'>,
  ): Promise<void> {
    try {
      await this.db.insertInto('currency_statistics').values(row).execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      throw e;
    }
  }

  async upsertDailyCurrencyRates(
    row: Omit<NewCurrencyRatesRow, 'id'>,
  ): Promise<void> {
    try {
      await this.db
        .insertInto('currency_rates')
        .values(row)
        .onConflict((oc) =>
          oc.columns(['base', 'date']).doUpdateSet({
            cad: row.cad,
            eur: row.eur,
            aud: row.aud,
            mxn: row.mxn,
            gbp: row.gbp,
            jpy: row.jpy,
            cny: row.cny,
            rub: row.rub,
            uah: row.uah,
            chf: row.chf,
          }),
        )
        .execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      throw e;
    }
  }

  async insertHiveEngineRate(row: Omit<NewHiveEngineRatesRow, 'id'>): Promise<void> {
    try {
      await this.db.insertInto('hive_engine_rates').values(row).execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      throw e;
    }
  }

  async hasDailyCurrencyStatisticUtcDate(utcYmd: string): Promise<boolean> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(utcYmd)) {
      return false;
    }
    const start = new Date(`${utcYmd}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 86_400_000);
    try {
      const hit = await this.db
        .selectFrom('currency_statistics')
        .select(['id'])
        .where('is_daily', '=', true)
        .where('created_at', '>=', start)
        .where('created_at', '<', end)
        .executeTakeFirst();
      return hit !== undefined;
    } catch (e) {
      this.logger.error((e as Error).message);
      return false;
    }
  }

  async insertHiveEngineDaily(
    row: Omit<NewHiveEngineRatesRow, 'id'>,
  ): Promise<void> {
    try {
      await this.db.insertInto('hive_engine_rates').values(row).execute();
    } catch (e) {
      if ((e as { code?: string }).code === '23505') {
        return;
      }
      this.logger.error((e as Error).message);
      throw e;
    }
  }

  async getLatestStatistic(
    isDaily: boolean,
  ): Promise<CurrencyStatisticsRow | undefined> {
    try {
      return await this.db
        .selectFrom('currency_statistics')
        .selectAll()
        .where('is_daily', '=', isDaily)
        .orderBy('created_at', 'desc')
        .executeTakeFirst();
    } catch (e) {
      this.logger.error((e as Error).message);
      return undefined;
    }
  }

  async listDailyStatisticsLimitDesc(
    limit: number,
  ): Promise<CurrencyStatisticsRow[]> {
    try {
      return await this.db
        .selectFrom('currency_statistics')
        .selectAll()
        .where('is_daily', '=', true)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  async listDailyStatisticsDescendingSinceUtc(
    utcStart: Date,
  ): Promise<CurrencyStatisticsRow[]> {
    try {
      return await this.db
        .selectFrom('currency_statistics')
        .selectAll()
        .where('is_daily', '=', true)
        .where('created_at', '>=', utcStart)
        .orderBy('created_at', 'desc')
        .execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  async listOrdinaryStatisticsSince(
    isDaily: boolean,
    utcStart: Date,
  ): Promise<CurrencyStatisticsRow[]> {
    try {
      return await this.db
        .selectFrom('currency_statistics')
        .selectAll()
        .where('is_daily', '=', isDaily)
        .where('created_at', '>=', utcStart)
        .orderBy('created_at', 'desc')
        .execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  async avgOrdinaryStatisticBetween(
    utcStart: Date,
    utcEndExclusive: Date,
  ): Promise<{
    hive_usd: number;
    hive_usd_24h_change: number;
    hive_btc: number;
    hive_btc_24h_change: number;
    hbd_usd: number;
    hbd_usd_24h_change: number;
    hbd_btc: number;
    hbd_btc_24h_change: number;
  } | null> {
    try {
      const row = await this.db
        .selectFrom('currency_statistics')
        .where('is_daily', '=', false)
        .where('created_at', '>=', utcStart)
        .where('created_at', '<', utcEndExclusive)
        .select(({ fn }) => [
          fn.avg<number | null>('hive_usd').as('hive_usd'),
          fn
            .avg<number | null>('hive_usd_24h_change')
            .as('hive_usd_24h_change'),
          fn.avg<number | null>('hive_btc').as('hive_btc'),
          fn
            .avg<number | null>('hive_btc_24h_change')
            .as('hive_btc_24h_change'),
          fn.avg<number | null>('hbd_usd').as('hbd_usd'),
          fn
            .avg<number | null>('hbd_usd_24h_change')
            .as('hbd_usd_24h_change'),
          fn.avg<number | null>('hbd_btc').as('hbd_btc'),
          fn
            .avg<number | null>('hbd_btc_24h_change')
            .as('hbd_btc_24h_change'),
        ])
        .executeTakeFirst();

      if (!row?.hive_usd || Number.isNaN(Number(row.hive_usd))) {
        return null;
      }
      return {
        hive_usd: Number(row.hive_usd),
        hive_usd_24h_change: Number(row.hive_usd_24h_change ?? 0),
        hive_btc: Number(row.hive_btc ?? 0),
        hive_btc_24h_change: Number(row.hive_btc_24h_change ?? 0),
        hbd_usd: Number(row.hbd_usd ?? 0),
        hbd_usd_24h_change: Number(row.hbd_usd_24h_change ?? 0),
        hbd_btc: Number(row.hbd_btc ?? 0),
        hbd_btc_24h_change: Number(row.hbd_btc_24h_change ?? 0),
      };
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  async getLatestRatesForSymbols(params: {
    base: string;
    symbolsUpper: string[];
  }): Promise<{
    rates: Partial<FiatColumns>;
    row: CurrencyRatesRow | undefined;
  } | null> {
    try {
      const row = await this.db
        .selectFrom('currency_rates')
        .selectAll()
        .where('base', '=', params.base)
        .orderBy('date', 'desc')
        .executeTakeFirst();
      if (!row) {
        return null;
      }
      const rates: Partial<FiatColumns> = { ...ZERO_FIAT_ROW };
      for (const s of params.symbolsUpper) {
        const col = isoToColumn(s.trim().toUpperCase());
        if (col) {
          rates[col] = Number((row as never)[col]);
        }
      }
      return { rates, row };
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  async getLegacyLatestRates(params: {
    base: string;
    symbolsComma: string;
  }): Promise<Record<string, number>> {
    try {
      const symbols = params.symbolsComma
        .split(',')
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean);

      const row = await this.db
        .selectFrom('currency_rates')
        .selectAll()
        .where('base', '=', params.base)
        .orderBy('date', 'desc')
        .executeTakeFirst();

      const out: Record<string, number> = { [params.base]: 1 };

      if (!row) {
        return out;
      }
      if (
        symbols.length === 1 &&
        symbols[0]!.toUpperCase() === params.base.toUpperCase()
      ) {
        out[symbols[0]!.toUpperCase()] = 1;
        return out;
      }

      for (const iso of FIAT_TARGET_CODES) {
        if (symbols.includes(iso)) {
          const col = isoToColumn(iso)!;
          out[iso] = Number((row as never)[col]);
        }
      }
      return out;
    } catch (e) {
      this.logger.error((e as Error).message);
      return { [params.base]: 1 };
    }
  }

  async findHiveDailyByBaseAndDate(params: {
    base: string;
    dateIso: string;
  }): Promise<HiveEngineRatesRow | undefined> {
    try {
      return await this.db
        .selectFrom('hive_engine_rates')
        .selectAll()
        .where('base', '=', params.base)
        .where('is_daily', '=', true)
        .where('date', '=', params.dateIso as never)
        .executeTakeFirst();
    } catch (e) {
      this.logger.error((e as Error).message);
      return undefined;
    }
  }

  async listHiveEngineRates(params: {
    base: string;
    isDaily: boolean;
    sinceDateInclusive?: string;
    limit?: number;
    orderAsc: boolean;
  }): Promise<HiveEngineRatesRow[]> {
    try {
      let q = this.db
        .selectFrom('hive_engine_rates')
        .selectAll()
        .where('base', '=', params.base)
        .where('is_daily', '=', params.isDaily);

      if (params.sinceDateInclusive) {
        q = q.where('date', '>=', params.sinceDateInclusive as never);
      }

      const ord = params.orderAsc ? 'asc' : 'desc';
      q = q.orderBy('date', ord);

      if (params.limit !== undefined) {
        q = q.limit(params.limit);
      }
      return await q.execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  async avgOrdinaryHiveRatesForDay(params: {
    base: string;
    dateIso: string;
  }): Promise<{ rate_hive: number; rate_usd: number } | null> {
    try {
      const row = await this.db
        .selectFrom('hive_engine_rates')
        .where('base', '=', params.base)
        .where('is_daily', '=', false)
        .where('date', '=', params.dateIso as never)
        .select(({ fn }) => [
          fn.avg<number | null>('rate_hive').as('rate_hive'),
          fn.avg<number | null>('rate_usd').as('rate_usd'),
        ])
        .executeTakeFirst();

      if (!row?.rate_hive || Number.isNaN(Number(row.rate_hive))) {
        return null;
      }

      return {
        rate_hive: Number(row.rate_hive),
        rate_usd: Number(row.rate_usd ?? 0),
      };
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  fiatFromUsdQuotes(quotes?: Record<string, number>): FiatColumns {
    if (!quotes) {
      return { ...ZERO_FIAT_ROW };
    }

    const out: FiatColumns = { ...ZERO_FIAT_ROW };
    for (const [pair, raw] of Object.entries(quotes)) {
      const col = USD_PAIR_TO_COLUMN_LOOKUP[pair];
      if (col) {
        out[col] = Number(raw);
      }
    }
    return out;
  }
}
