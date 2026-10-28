import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientModule } from '@opden-data-layer/clients';
import { DatabaseModule } from '../database/database.module';
import { KnowledgeReindexBootstrapService } from './knowledge-reindex-bootstrap.service';
import { SkillsRefreshService } from './skills-refresh.service';

@Module({
  imports: [
    DatabaseModule,
    RedisClientModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('redis.uri', 'redis://localhost:6379'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SkillsRefreshService, KnowledgeReindexBootstrapService],
  exports: [KnowledgeReindexBootstrapService, SkillsRefreshService],
})
export class KnowledgeBootstrapModule {}
