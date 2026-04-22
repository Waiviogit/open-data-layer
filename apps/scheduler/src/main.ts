import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { parseSchedulerArgv } from './argv.util';
import { MainModule } from './main.module';
import { SchedulerDispatchService } from './scheduler/scheduler-dispatch.service';
import { SchedulerWorkerService } from './scheduler/scheduler-worker.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MainModule, {
    logger: ['log', 'error', 'warn'],
  });

  process.on('SIGINT', () => {
    void app.close().then(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    void app.close().then(() => process.exit(0));
  });

  const { runJob, payload } = parseSchedulerArgv();
  if (runJob) {
    const dispatch = app.get(SchedulerDispatchService);
    const worker = app.get(SchedulerWorkerService);
    const result = await dispatch.tryDispatch(runJob, 'manual', payload);
    if (result === 'unknown') {
      Logger.error(`Manual run: unknown job ${runJob}`);
      await app.close();
      process.exit(1);
    }
    if (result === 'disabled') {
      Logger.error(`Manual run: job ${runJob} is disabled`);
      await app.close();
      process.exit(1);
    }
    if (result === 'skipped') {
      Logger.warn(`Manual run: ${runJob} was skipped (overlap or global off)`);
      await app.close();
      process.exit(0);
    }
    if (result === 'lost_race') {
      Logger.warn(`Manual run: lost enqueue lock for ${runJob}`);
      await app.close();
      process.exit(0);
    }
    await worker.drainQueue();
    Logger.log(`Manual run finished for ${runJob}`);
    await app.close();
    process.exit(0);
    return;
  }

  Logger.log('Scheduler service running (cron + worker)');
}

void bootstrap();
