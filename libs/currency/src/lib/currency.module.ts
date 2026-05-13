import { DynamicModule, Module } from '@nestjs/common';

import { CurrencyCollectService } from './currency-collect.service';
import { CurrencyQueryService } from './currency-query.service';
import { CurrencyRepository } from './currency.repository';
import { CURRENCY_DATABASE } from './currency.tokens';

export type CurrencyModuleOptions = {
  /** Kysely token for {@link import('@opden-data-layer/core').OdlDatabase} (e.g. app `KYSELY`). */
  kyselyToken: string | symbol;
};

/** Nest module binding currency persistence + ingestion/query services to ODL Postgres (registered as global). */
@Module({})
export class CurrencyModule {
  static register(opts: CurrencyModuleOptions): DynamicModule {
    return {
      module: CurrencyModule,
      global: true,
      providers: [
        CurrencyRepository,
        CurrencyCollectService,
        CurrencyQueryService,
        {
          provide: CURRENCY_DATABASE,
          useExisting: opts.kyselyToken,
        },
      ],
      exports: [CurrencyRepository, CurrencyCollectService, CurrencyQueryService],
    };
  }
}
