import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import {
  HIVE_RPC_NODES,
  HiveClientModule,
  HiveEngineClientModule,
  IpfsClientModule,
  RedisClientModule,
} from '@opden-data-layer/clients';
import { DatabaseModule } from './database';
import { RepositoriesModule } from './repositories';
import chainIndexerConfig from './config/chain-indexer.config';
import { HiveParserModule } from './domain/hive-parser/hive-parser.module';
import { GovernanceModule } from './domain/governance';
import { SiteCanonicalModule } from './domain/site-canonical/site-canonical.module';
import { UserObjectPowersModule } from './domain/user-object-powers/user-object-powers.module';
import { HiveEngineParserModule } from './domain/hive-engine-parser/hive-engine-parser.module';
import { NotificationAdapterModule } from './domain/notification-adapter/notification-adapter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/chain-indexer/.env', '.env'],
      load: [chainIndexerConfig],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    IpfsClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        apiUrl: config.get<string>('ipfs.apiUrl', 'http://localhost:5001'),
        gatewayUrl: config.get<string | undefined>('ipfs.gatewayUrl'),
      }),
      inject: [ConfigService],
    }),
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
    HiveEngineClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const client = config.get<{
          nodes: string[];
          cachePrefix?: string;
          cacheTtlSeconds?: number;
          maxResponseTimeMs?: number;
          urlRotationDb?: number;
        }>('hiveEngine.client');
        if (!client) {
          throw new Error('MainModule: hiveEngine.client config is missing');
        }
        return client;
      },
      inject: [ConfigService],
    }),
    DatabaseModule,
    RepositoriesModule,
    HiveParserModule,
    GovernanceModule,
    SiteCanonicalModule,
    UserObjectPowersModule,
    HiveEngineParserModule,
    NotificationAdapterModule,
  ],
})
export class MainModule {}

