import { DynamicModule, Module, type ModuleMetadata } from '@nestjs/common';

import { CurrencyCollectService } from './currency-collect.service';
import { CurrencyQueryService } from './currency-query.service';
import { CurrencyRepository } from './currency.repository';
import { CURRENCY_DATABASE } from './currency.tokens';

export type CurrencyModuleOptions = {
  /** Kysely token for {@link import('@opden-data-layer/core').OdlDatabase} (e.g. app `KYSELY`). */
  kyselyToken: string | symbol;
  /**
   * When true, registers {@link CurrencyCollectService}. You must pass `imports` that provide
   * {@link import('@opden-data-layer/clients').CoinGeckoClient}, `ExchangeRateClient`, and
   * `HiveEngineClient` (e.g. the corresponding `*ClientModule.forRootAsync` dynamic modules).
   * Default false so read-only apps do not need CoinGecko.
   */
  includeCollectService?: boolean;
  /** Required when `includeCollectService` is true — client modules whose exports satisfy collect deps. */
  imports?: ModuleMetadata['imports'];
};

/** Nest module binding currency persistence + ingestion/query services to ODL Postgres (registered as global). */
@Module({})
export class CurrencyModule {
  static register(opts: CurrencyModuleOptions): DynamicModule {
    const includeCollect = opts.includeCollectService === true;
    return {
      module: CurrencyModule,
      global: true,
      imports: [...(opts.imports ?? [])],
      providers: [
        CurrencyRepository,
        CurrencyQueryService,
        ...(includeCollect ? [CurrencyCollectService] : []),
        {
          provide: CURRENCY_DATABASE,
          useExisting: opts.kyselyToken,
        },
      ],
      exports: [
        CurrencyRepository,
        CurrencyQueryService,
        ...(includeCollect ? [CurrencyCollectService] : []),
      ],
    };
  }
}
