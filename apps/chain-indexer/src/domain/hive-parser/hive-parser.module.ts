import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HiveParserProvidersModule } from './hive-parser-providers.module';
import { HiveProcessorModule } from '@opden-data-layer/core';
import { redisKey } from '../../constants/redis-keys';

@Module({
  imports: [
    HiveParserProvidersModule,
    HiveProcessorModule.forRootAsync({
      imports: [HiveParserProvidersModule],
      useFactory: (config: ConfigService) => ({
        blockNumberKey: redisKey.hiveBlockNumber(),
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
