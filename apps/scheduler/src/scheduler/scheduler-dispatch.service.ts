import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JsonValue } from '@opden-data-layer/core';
import { getJobByName } from '../jobs/jobs.registry';
import { SchedulerLockService } from './scheduler-lock.service';
import { SchedulerRepository, type JobTrigger } from '../repositories/scheduler.repository';

@Injectable()
export class SchedulerDispatchService {
  private readonly logger = new Logger(SchedulerDispatchService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly lockService: SchedulerLockService,
    private readonly repo: SchedulerRepository,
  ) {}

  /**
   * Enqueues a run + queue row if allowed. Returns true if a job was enqueued.
   */
  async tryDispatch(
    jobName: string,
    trigger: JobTrigger,
    payload: JsonValue | null = null,
  ): Promise<'enqueued' | 'skipped' | 'lost_race' | 'disabled' | 'unknown'> {
    const def = getJobByName(jobName);
    if (!def) {
      this.logger.error(`Unknown job: ${jobName}`);
      return 'unknown';
    }
    if (def.enabled === false) {
      this.logger.warn(`Job ${jobName} is disabled in code`);
      return 'disabled';
    }
    const disabledRaw = this.config.get<Set<string> | undefined>(
      'scheduler.disabledJobNames',
    );
    const disabled = disabledRaw ?? new Set<string>();
    if (disabled.has(jobName)) {
      this.logger.warn(`Job ${jobName} is disabled via SCHEDULER_DISABLED_JOBS`);
      return 'disabled';
    }
    if (
      trigger === 'scheduled' &&
      !this.config.get<boolean>('scheduler.globalEnabled', true)
    ) {
      this.logger.debug(`Global scheduler off; skip ${jobName}`);
      return 'skipped';
    }

    if (!def.allowOverlap) {
      const has = await this.repo.hasIncompleteRun(jobName);
      if (has) {
        this.logger.log(
          `Skip ${jobName} (${trigger}): overlap not allowed, incomplete run exists`,
        );
        await this.repo.insertSkippedRun(jobName, trigger);
        return 'skipped';
      }
    }

    const release = await this.lockService.tryTakeEnqueueLock(
      jobName,
      def.lockTtlSec,
    );
    if (!release) {
      this.logger.debug(`Lost enqueue race for ${jobName}`);
      return 'lost_race';
    }
    const maxAttempts = 1 + def.retryCount;
    try {
      if (!def.allowOverlap) {
        const has = await this.repo.hasIncompleteRun(jobName);
        if (has) {
          await this.repo.insertSkippedRun(jobName, trigger);
          return 'skipped';
        }
      }
      await this.repo.insertRunWithQueue(
        jobName,
        trigger,
        maxAttempts,
        payload,
      );
      this.logger.log(`Enqueued ${jobName} (${trigger})`);
      return 'enqueued';
    } catch (e) {
      this.logger.error(
        `Failed to enqueue ${jobName}: ${(e as Error).message}`,
      );
      throw e;
    } finally {
      await release();
    }
  }
}
