import { DynamicModule, Module } from '@nestjs/common';
import { HiveEngineClient } from './hive-engine-client';
import {
  HIVE_ENGINE_CLIENT_MODULE_OPTIONS,
  HiveEngineClientModuleOptions,
} from './hive-engine-client.options';

@Module({})
export class HiveEngineClientModule {
  static forRoot(options: HiveEngineClientModuleOptions): DynamicModule {
    return {
      module: HiveEngineClientModule,
      global: true,
      providers: [
        { provide: HIVE_ENGINE_CLIENT_MODULE_OPTIONS, useValue: options },
        HiveEngineClient,
      ],
      exports: [HiveEngineClient],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => HiveEngineClientModuleOptions | Promise<HiveEngineClientModuleOptions>;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: HiveEngineClientModule,
      global: true,
      imports: options.imports || [],
      providers: [
        {
          provide: HIVE_ENGINE_CLIENT_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        HiveEngineClient,
      ],
      exports: [HiveEngineClient],
    };
  }
}
