import { DynamicModule, Module } from '@nestjs/common';
import { BlockCacheService } from './block-cache.service';
import { HiveProcessorService } from './hive-processor.service';
import { HIVE_PROCESSOR_OPTIONS } from './hive-processor.options';
import type { HiveProcessorModuleOptions } from './hive-processor.options';

@Module({})
export class HiveProcessorModule {
  static forRoot(options: {
    config: HiveProcessorModuleOptions;
    imports?: any[];
  }): DynamicModule {
    return {
      module: HiveProcessorModule,
      imports: options.imports || [],
      providers: [
        { provide: HIVE_PROCESSOR_OPTIONS, useValue: options.config },
        BlockCacheService,
        HiveProcessorService,
      ],
      exports: [HiveProcessorService, BlockCacheService],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => HiveProcessorModuleOptions | Promise<HiveProcessorModuleOptions>;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: HiveProcessorModule,
      imports: options.imports || [],
      providers: [
        {
          provide: HIVE_PROCESSOR_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        BlockCacheService,
        HiveProcessorService,
      ],
      exports: [HiveProcessorService, BlockCacheService],
    };
  }
}
