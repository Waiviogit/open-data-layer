import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  HIVE_RPC_NODES,
  HiveClientModule,
  IpfsClientModule,
  RedisClientModule,
} from '@opden-data-layer/clients';
import { DatabaseModule } from './database';
import { RepositoriesModule } from './repositories';
import chainIndexerConfig from './config/chain-indexer.config';
import { HiveParserModule } from './domain/hive-parser/hive-parser.module';
import { GovernanceModule } from './domain/governance';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/chain-indexer/.env', '.env'],
      load: [chainIndexerConfig],
    }),
    EventEmitterModule.forRoot(),
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
    DatabaseModule,
    RepositoriesModule,
    HiveParserModule,
    GovernanceModule,
  ],
})
export class MainModule {}

