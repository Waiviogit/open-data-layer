import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database';
import { RepositoriesModule } from './repositories';
import chainIndexerConfig from './config/chain-indexer.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [chainIndexerConfig],
    }),
    DatabaseModule,
    RepositoriesModule,
  ],
})
export class MainModule {}

