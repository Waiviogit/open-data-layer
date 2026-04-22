import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { isManualRunMode } from '../argv.util';
import { cronJobRegistry } from '../jobs/jobs.registry';
import { SchedulerDispatchService } from './scheduler-dispatch.service';

@Injectable()
export class SchedulerCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerCronService.name);
  private jobs: { name: string; job: CronJob }[] = [];

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly dispatch: SchedulerDispatchService,
  ) {
    if (!this.registry) {
      this.logger.error('SchedulerRegistry is missing: add ScheduleModule.forRoot() before feature modules');
    }
  }

  onModuleInit(): void {
    if (isManualRunMode()) {
      this.logger.log('Cron jobs not registered (manual run mode)');
      return;
    }
    for (const j of cronJobRegistry) {
      if (j.enabled === false) {
        this.logger.log(`Cron not registered (disabled in code): ${j.name}`);
        continue;
      }
      const cj = new CronJob(
        j.schedule,
        () => {
          void this.dispatch
            .tryDispatch(j.name, 'scheduled', null)
            .catch((e) => {
              this.logger.error(
                `Scheduled dispatch for ${j.name} failed: ${(e as Error).message}`,
              );
            });
        },
        null,
        false,
        'UTC',
      );
      cj.name = j.name;
      this.registry.addCronJob(`cron:${j.name}`, cj);
      cj.start();
      this.jobs.push({ name: j.name, job: cj });
      this.logger.log(`Registered cron job ${j.name} (${j.schedule} UTC)`);
    }
  }

  onModuleDestroy(): void {
    for (const { name, job } of this.jobs) {
      job.stop();
      try {
        this.registry.deleteCronJob(`cron:${name}`);
      } catch {
        // ignore
      }
    }
    this.jobs = [];
  }
}
