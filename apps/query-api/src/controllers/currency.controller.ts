import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrencyQueryService } from '@opden-data-layer/currency';

/** Postgres-ingested HIVE/HBD + Hive Engine + Hive-median fallback + FX (Waiv-compatible). */
@Controller({ path: 'currency', version: '1' })
export class CurrencyController {
  constructor(private readonly queries: CurrencyQueryService) {}

  @Get('market')
  async market(
    @Query('ids') ids?: string,
    @Query('vs_currencies') vsCurrencies?: string,
  ): Promise<{ current: Record<string, unknown>; weekly: Record<string, unknown>[] }> {
    return this.queries.marketInfo({
      idsComma: ids,
      currenciesComma: vsCurrencies,
    });
  }

  /** Latest fiat crosses from persisted `currency_rates` (defaults from DB row). */
  @Get('rates/:base/latest')
  async fiatLatest(
    @Param('base') base: string,
    @Query('symbols') symbols: string | undefined,
  ): Promise<Record<string, number>> {
    return this.queries.legacyRateLatest(base, symbols ?? '');
  }

  /** WAIV (or configured base): current Hive Engine aggregates + trailing daily window. */
  @Get('engine/rates')
  async engineRates(
    @Query('base') base?: string,
  ): Promise<{ current: unknown; weekly: unknown[]; error?: string }> {
    return this.queries.engineRates(base);
  }

  @Get('engine/current')
  async engineCurrent(@Query('base') base?: string) {
    return this.queries.engineCurrent(base);
  }

  @Get('engine/chart')
  async engineChart(
    @Query('period') period: string,
    @Query('base') base?: string,
  ) {
    return this.queries.engineChart(period, base);
  }

  /** Symbol → USD scaling using Hive swap pools priced off HBD/HIVE. */
  @Get('engine/pools/usd')
  async poolsUsd(@Query('symbols') symbolsCsv: string) {
    return this.queries.enginePoolsUsdCsv(symbolsCsv);
  }
}
