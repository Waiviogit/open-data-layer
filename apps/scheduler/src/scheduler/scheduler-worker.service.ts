import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { getJobByName } from '../jobs/jobs.registry';
import {
  SchedulerRepository,
  type ClaimedSchedulerQueueItem,
} from '../repositories/scheduler.repository';
import { isManualRunMode } from '../argv.util';

const DEFAULT_WORKER_INTERVAL = 'schedulerWorkerTick';

@Injectable()
export class SchedulerWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SchedulerWorkerService.name);
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly registry: SchedulerRegistry,
    private readonly repo: SchedulerRepository,
  ) {}

  onModuleInit(): void {
    if (isManualRunMode()) {
      this.logger.log('Worker interval skipped (manual run mode)');
      return;
    }
    const ms = this.config.get<number>('scheduler.workerIntervalMs', 2_000);
    const every = Math.max(250, Number.isFinite(ms) ? ms : 2_000);
    this.interval = setInterval(() => {
      void this.processOneRound();
    }, every);
    this.registry.addInterval(DEFAULT_WORKER_INTERVAL, this.interval);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      try {
        this.registry.deleteInterval(DEFAULT_WORKER_INTERVAL);
      } catch {
        // not registered
      }
      clearInterval(this.interval);
    }
  }

  /**
   * @returns how many items were taken from the queue (not necessarily success).
   */
  async processOneRound(): Promise<number> {
    const size = this.config.get<number>(
      'scheduler.workerBatchSize',
      5,
    );
    const limit = Math.max(1, size);
    const batch = await this.repo.claimBatch(limit);
    for (const item of batch) {
      await this.processItem(item);
    }
    return batch.length;
  }

  /**
   * Used after manual dispatch to run claims until the queue is empty.
   */
  async drainQueue(maxRounds = 200): Promise<void> {
    for (let i = 0; i < maxRounds; i += 1) {
      const n = await this.processOneRound();
      if (n === 0) {
        return;
      }
    }
    this.logger.warn('drainQueue: stopped at maxRounds; queue may not be empty');
  }

  private async processItem(item: ClaimedSchedulerQueueItem): Promise<void> {
    const def = getJobByName(item.jobName);
    if (!def) {
      await this.repo.failPermanently(
        item.runId,
        item.queueId,
        `No handler for job name ${item.jobName}`,
        0,
      );
      return;
    }
    const ac = new AbortController();
    const to = setTimeout(() => {
      ac.abort();
    }, def.timeoutMs);
    const t0 = Date.now();
    try {
      await this.repo.setRunToRunning(item.runId, item.attempts);
      await def.run({
        jobName: item.jobName,
        runId: item.runId,
        attempt: item.attempts,
        payload: item.payload,
        signal: ac.signal,
      });
      const d = Date.now() - t0;
      if (ac.signal.aborted) {
        throw new Error('job aborted: timeout or signal');
      }
      await this.repo.completeSuccess(item.runId, item.queueId, d);
    } catch (e) {
      const err = e as Error;
      const d = Date.now() - t0;
      const msg =
        err?.message && err.message.length > 0
          ? err.message
          : 'Job failed without message';
      if (item.attempts < item.maxAttempts) {
        this.logger.warn(
          `${item.jobName} try ${item.attempts}/${item.maxAttempts} failed, will retry: ${msg}`,
        );
        await this.repo.failAndRequeue(
          item.runId,
          item.queueId,
          msg,
          def.retryDelayMs,
        );
      } else {
        this.logger.error(
          `${item.jobName} failed after ${item.attempts} attempts: ${msg}`,
        );
        await this.repo.failPermanently(
          item.runId,
          item.queueId,
          msg,
          d,
        );
      }
    } finally {
      clearTimeout(to);
    }
  }
}
