import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientFactory } from '@opden-data-layer/clients';
import { randomUUID } from 'crypto';
import { schedulerRedisKey } from '../constants/redis-keys';

@Injectable()
export class SchedulerLockService {
  private readonly logger = new Logger(SchedulerLockService.name);

  constructor(
    private readonly redis: RedisClientFactory,
    private readonly config: ConfigService,
  ) {}

  /**
   * Try to take the per-job enqueue lock (one winner across replicas).
   * @returns null if not acquired, else a release function (must be called in finally)
   */
  async tryTakeEnqueueLock(
    jobName: string,
    lockTtlSec: number,
  ): Promise<(() => Promise<void>) | null> {
    const cap = this.config.get<number>(
      'scheduler.enqueueLockTokenTtlSec',
      30,
    );
    const ttl = Math.min(Math.max(1, lockTtlSec), cap);
    const key = schedulerRedisKey.enqueueLock(jobName);
    const token = randomUUID();
    const client = this.redis.getClient(0);
    const ok = await client.trySetNx(key, token, ttl);
    if (!ok) {
      return null;
    }
    return async () => {
      const released = await client.releaseLockIfValue(key, token);
      if (!released) {
        this.logger.debug(
          `Enqueue lock for ${jobName} was not released (expired or stolen)`,
        );
      }
    };
  }
}
