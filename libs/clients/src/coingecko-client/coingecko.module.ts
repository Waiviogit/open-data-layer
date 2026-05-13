import {
  DynamicModule,
  Module,
  type InjectionToken,
  type ModuleMetadata,
  type OptionalFactoryDependency,
} from '@nestjs/common';
import { CoinGeckoClient } from './coingecko-client';
import {
  COINGECKO_CLIENT_MODULE_OPTIONS,
  type CoinGeckoClientModuleOptions,
} from './coingecko-client.options';

@Module({})
export class CoinGeckoClientModule {
  static forRoot(options: CoinGeckoClientModuleOptions): DynamicModule {
    return {
      module: CoinGeckoClientModule,
      global: true,
      providers: [
        { provide: COINGECKO_CLIENT_MODULE_OPTIONS, useValue: options },
        CoinGeckoClient,
      ],
      exports: [CoinGeckoClient],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: unknown[]
    ) =>
      | CoinGeckoClientModuleOptions
      | Promise<CoinGeckoClientModuleOptions>;
    inject?: Array<InjectionToken | OptionalFactoryDependency>;
    imports?: ModuleMetadata['imports'];
  }): DynamicModule {
    return {
      module: CoinGeckoClientModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: COINGECKO_CLIENT_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        CoinGeckoClient,
      ],
      exports: [CoinGeckoClient],
    };
  }
}
