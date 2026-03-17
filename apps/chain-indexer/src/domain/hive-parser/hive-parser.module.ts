import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HiveParserProvidersModule } from './hive-parser-providers.module';
import { HiveProcessorModule } from '@opden-data-layer/core';

@Module({
  imports: [
    HiveParserProvidersModule,
    HiveProcessorModule.forRootAsync({
      imports: [HiveParserProvidersModule],
      useFactory: (config: ConfigService) => ({
        blockNumberKey: config.get<string>(
          'hive.blockNumberKey',
          'chain_indexer:block_number',
        ),
        startBlockNumber: config.get<number>(
          'hive.startBlockNumber',
          102138605,
        ),
        redisDb: 0,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class HiveParserModule {}
