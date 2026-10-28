import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { KnowledgeBootstrapModule } from './bootstrap/knowledge-bootstrap.module';
import knowledgeApiConfig from './config/knowledge-api.config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/knowledge-api/.env', '.env'],
      load: [knowledgeApiConfig],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    KnowledgeBootstrapModule,
    HealthModule,
    McpModule,
  ],
})
export class MainModule {}
