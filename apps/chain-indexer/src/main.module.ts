import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database';
import chainIndexerConfig from './config/chain-indexer.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [chainIndexerConfig],
    }),
    DatabaseModule,
  ],
})
export class MainModule {}

