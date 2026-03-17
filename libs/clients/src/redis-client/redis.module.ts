import { DynamicModule, Module } from '@nestjs/common';
import { RedisClientFactory } from './redis-client';
import { UrlRotationService } from './url-rotation.service';
import {
  REDIS_MODULE_OPTIONS,
  RedisModuleOptions,
} from './redis-client.options';

@Module({})
export class RedisClientModule {
  static forRoot(options: RedisModuleOptions): DynamicModule {
    return {
      module: RedisClientModule,
      global: true,
      providers: [
        { provide: REDIS_MODULE_OPTIONS, useValue: options },
        RedisClientFactory,
        UrlRotationService,
      ],
      exports: [RedisClientFactory, UrlRotationService],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => RedisModuleOptions | Promise<RedisModuleOptions>;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: RedisClientModule,
      global: true,
      imports: options.imports || [],
      providers: [
        {
          provide: REDIS_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        RedisClientFactory,
        UrlRotationService,
      ],
      exports: [RedisClientFactory, UrlRotationService],
    };
  }
}
