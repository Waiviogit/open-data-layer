import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientModule } from '@opden-data-layer/clients';
import { DatabaseModule } from '../database';
import { RepositoriesModule } from '../repositories/repositories.module';
import { SchedulerLockService } from './scheduler-lock.service';
import { SchedulerDispatchService } from './scheduler-dispatch.service';
import { SchedulerWorkerService } from './scheduler-worker.service';
import { SchedulerCronService } from './scheduler-cron.service';
import { SiteRegistryDailyRunner } from '../jobs/site-registry-daily.runner';

@Module({
  imports: [
    DatabaseModule,
    RepositoriesModule,
    RedisClientModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('redis.uri', 'redis://localhost:6379'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    SiteRegistryDailyRunner,
    SchedulerLockService,
    SchedulerDispatchService,
    SchedulerWorkerService,
    SchedulerCronService,
  ],
  exports: [SchedulerDispatchService, SchedulerWorkerService],
})
export class SchedulerModule {}
