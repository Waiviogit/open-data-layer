import { DynamicModule, Module } from '@nestjs/common';
import { BlockCacheService } from './block-cache.service';
import { HiveEngineProcessorService } from './hive-engine-processor.service';
import { HIVE_ENGINE_PROCESSOR_OPTIONS } from './hive-engine-processor.options';
import type { HiveEngineProcessorModuleOptions } from './hive-engine-processor.options';

@Module({})
export class HiveEngineProcessorModule {
  static forRoot(options: {
    config: HiveEngineProcessorModuleOptions;
    imports?: any[];
  }): DynamicModule {
    return {
      module: HiveEngineProcessorModule,
      imports: options.imports || [],
      providers: [
        { provide: HIVE_ENGINE_PROCESSOR_OPTIONS, useValue: options.config },
        BlockCacheService,
        HiveEngineProcessorService,
      ],
      exports: [HiveEngineProcessorService, BlockCacheService],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) =>
      | HiveEngineProcessorModuleOptions
      | Promise<HiveEngineProcessorModuleOptions>;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: HiveEngineProcessorModule,
      imports: options.imports || [],
      providers: [
        {
          provide: HIVE_ENGINE_PROCESSOR_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        BlockCacheService,
        HiveEngineProcessorService,
      ],
      exports: [HiveEngineProcessorService, BlockCacheService],
    };
  }
}
