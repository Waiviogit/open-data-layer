import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  HIVE_RPC_NODES,
  HiveClientModule,
  RedisClientModule,
} from '@opden-data-layer/clients';
import { ControllersModule } from './controllers';
import { DatabaseModule } from './database';
import { RepositoriesModule } from './repositories';
import { GovernanceModule } from './domain/governance';
import { ObjectProjectionModule } from './domain/object-projection';
import queryApiConfig from './config/query-api.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/query-api/.env', '.env'],
      load: [queryApiConfig],
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
    GovernanceModule,
    ObjectProjectionModule,
    ControllersModule,
  ],
})
export class MainModule {}

