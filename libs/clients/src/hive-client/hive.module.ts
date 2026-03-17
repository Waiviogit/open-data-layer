import { DynamicModule, Module } from '@nestjs/common';
import { HiveClient } from './hive-client';
import {
  HIVE_CLIENT_MODULE_OPTIONS,
  HiveClientModuleOptions,
} from './hive-client.options';

@Module({})
export class HiveClientModule {
  static forRoot(options: HiveClientModuleOptions): DynamicModule {
    return {
      module: HiveClientModule,
      global: true,
      providers: [
        { provide: HIVE_CLIENT_MODULE_OPTIONS, useValue: options },
        HiveClient,
      ],
      exports: [HiveClient],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => HiveClientModuleOptions | Promise<HiveClientModuleOptions>;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: HiveClientModule,
      global: true,
      imports: options.imports || [],
      providers: [
        {
          provide: HIVE_CLIENT_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        HiveClient,
      ],
      exports: [HiveClient],
    };
  }
}
