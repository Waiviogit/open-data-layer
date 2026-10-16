import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ExchangeRateClientModule,
  EthGatewayClientModule,
  HiveClientModule,
  HiveEngineClientModule,
  HiveEngineConvertClientModule,
  HiveEngineHistoryClientModule,
  TribaldexClientModule,
  ChangellyClientModule,
  type HiveEngineClientModuleOptions,
  HIVE_RPC_NODES,
  RedisClientModule,
} from '@opden-data-layer/clients';
import { CurrencyModule } from '@opden-data-layer/currency';
import queryApiConfig from './config/query-api.config';
import { ControllersModule } from './controllers';
import { McpModule } from './mcp';
import { DatabaseModule, KYSELY } from './database';
import { GovernanceModule } from './domain/governance';
import { GeoipModule } from './domain/geoip';
import { ObjectProjectionModule } from './domain/object-projection';
import { RepositoriesModule } from './repositories';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/query-api/.env', '.env'],
      load: [queryApiConfig],
    }),
    ScheduleModule.forRoot(),
    RedisClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('redis.uri', 'redis://localhost:6379'),
      }),
      inject: [ConfigService],
    }),
    HiveClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        nodes: HIVE_RPC_NODES,
        ...config.get('hive.client'),
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    CurrencyModule.register({ kyselyToken: KYSELY, includeCollectService: false }),
    ExchangeRateClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<{
          baseUrl: string;
          accessKey?: string;
          requestTimeoutMs: number;
        }>('currency.exchangeRate'),
      inject: [ConfigService],
    }),
    HiveEngineClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService): HiveEngineClientModuleOptions =>
        config.getOrThrow<HiveEngineClientModuleOptions>('hiveEngine.client'),
      inject: [ConfigService],
    }),
    HiveEngineHistoryClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const client = config.get<{
          nodes: string[];
          cachePrefix?: string;
          cacheTtlSeconds?: number;
          maxResponseTimeMs?: number;
          urlRotationDb?: number;
        }>('hiveEngine.historyClient');
        if (!client?.nodes?.length) {
          throw new Error('query-api: hiveEngine.historyClient.nodes is missing or empty');
        }
        return client;
      },
      inject: [ConfigService],
    }),
    HiveEngineConvertClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) =>
        config.getOrThrow('hiveEngine.convertClient'),
      inject: [ConfigService],
    }),
    TribaldexClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) =>
        config.getOrThrow('hiveEngine.tribaldexClient'),
      inject: [ConfigService],
    }),
    EthGatewayClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) =>
        config.getOrThrow('hiveEngine.ethGatewayClient'),
      inject: [ConfigService],
    }),
    ChangellyClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) =>
        config.getOrThrow('changelly'),
      inject: [ConfigService],
    }),
    RepositoriesModule,
    GovernanceModule,
    GeoipModule,
    ObjectProjectionModule,
    ControllersModule,
    McpModule,
  ],
})
export class MainModule {}
