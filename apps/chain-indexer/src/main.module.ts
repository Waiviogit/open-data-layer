import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HIVE_RPC_NODES, HiveClientModule, RedisClientModule } from '@opden-data-layer/clients';
import { DatabaseModule } from './database';
import { RepositoriesModule } from './repositories';
import chainIndexerConfig from './config/chain-indexer.config';
import { HiveParserModule } from './domain/hive-parser/hive-parser.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [chainIndexerConfig],
    }),
    RedisClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('redis.uri', 'redis://localhost:6379'),
      }),
      inject: [ConfigService],
    }),
    HiveClientModule.forRoot({
      nodes: HIVE_RPC_NODES,
    }),
    DatabaseModule,
    RepositoriesModule,
    HiveParserModule,
  ],
})
export class MainModule {}

