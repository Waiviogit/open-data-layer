import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientFactory } from '@opden-data-layer/clients';
import {
  KnowledgeRepository,
  reparseSkillsFromStoredBodies,
  runKnowledgeReindex,
  type KnowledgeDatabase,
  type ReindexStats,
} from '@opden-data-layer/knowledge';
import type { Kysely } from 'kysely';
import { randomUUID } from 'node:crypto';
import {
  COLD_START_MAX_WAIT_MS,
  COLD_START_POLL_INTERVAL_MS,
} from '../constants/reindex';
import { knowledgeApiRedisKey } from '../constants/redis-keys';
import { KYSELY } from '../database/database.module';
import { SkillsRefreshService } from './skills-refresh.service';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class KnowledgeReindexBootstrapService {
  private readonly logger = new Logger(KnowledgeReindexBootstrapService.name);
  private warmReindexStarted = false;

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<KnowledgeDatabase>,
    private readonly config: ConfigService,
    private readonly redisFactory: RedisClientFactory,
    private readonly skillsRefresh: SkillsRefreshService,
  ) {}

  private startupReindexEnabled(): boolean {
    return this.config.get<boolean>('knowledge.startupReindex') === true;
  }

  private workspaceRoot(): string {
    return this.config.getOrThrow<string>('knowledge.workspaceRoot');
  }

  private writeAgentRoutes(): boolean {
    return this.config.get<boolean>('knowledge.writeAgentRoutes') === true;
  }

  private minIntervalSec(): number {
    return this.config.get<number>(
      'knowledge.reindexMinIntervalSec',
      300,
    );
  }

  private lockTtlSec(): number {
    return this.config.get<number>('knowledge.reindexLockTtlSec', 600);
  }

  /** Sync gate: block listen until cold index is populated. */
  async runBeforeListen(): Promise<void> {
    if (!this.startupReindexEnabled()) {
      return;
    }

    const repo = new KnowledgeRepository(this.db);
    const fileCount = await repo.countFiles();
    if (fileCount === 0) {
      this.logger.log('Knowledge index empty — running startup reindex before listen');
      await this.ensureIndexPopulated();
      return;
    }

    await this.seedSkillsIfMissing();
  }

  /** Async warm reindex after listen (throttled). */
  runAfterListen(): void {
    if (!this.startupReindexEnabled() || this.warmReindexStarted) {
      return;
    }
    this.warmReindexStarted = true;
    void this.runWarmReindexIfDue();
  }

  private async runWarmReindexIfDue(): Promise<void> {
    const repo = new KnowledgeRepository(this.db);
    const fileCount = await repo.countFiles();
    if (fileCount === 0) {
      return;
    }

    if (await this.isThrottled()) {
      this.logger.debug('Startup reindex skipped (throttle)');
      return;
    }

    const release = await this.tryAcquireLock();
    if (!release) {
      this.logger.debug('Startup reindex skipped (lock held by another instance)');
      return;
    }

    try {
      if (await this.isThrottled()) {
        return;
      }
      const stats = await this.executeReindex();
      await this.recordLastReindexAt();
      this.logStats('warm startup reindex', stats);
    } catch (error) {
      this.logger.error((error as Error).message);
    } finally {
      await release();
    }
  }

  private async ensureIndexPopulated(): Promise<void> {
    const deadline = Date.now() + COLD_START_MAX_WAIT_MS;

    while (Date.now() < deadline) {
      const repo = new KnowledgeRepository(this.db);
      if ((await repo.countFiles()) > 0) {
        this.logger.log('Knowledge index populated by another instance');
        return;
      }

      const release = await this.tryAcquireLock();
      if (release) {
        try {
          if ((await repo.countFiles()) === 0) {
            const stats = await this.executeReindex();
            await this.recordLastReindexAt();
            this.logStats('cold startup reindex', stats);
            await this.skillsRefresh.seedFromSnapshot();
          }
          return;
        } finally {
          await release();
        }
      }

      await sleep(COLD_START_POLL_INTERVAL_MS);
    }

    throw new Error(
      `Knowledge index still empty after ${COLD_START_MAX_WAIT_MS}ms waiting for startup reindex`,
    );
  }

  private async seedSkillsIfMissing(): Promise<void> {
    const repo = new KnowledgeRepository(this.db);
    const paths = await repo.listPaths();
    if (!paths.some((p) => p.startsWith('odl/'))) {
      this.logger.log('Skills index empty — seeding from snapshot');
      await this.skillsRefresh.seedFromSnapshot();
      return;
    }
    const stats = await reparseSkillsFromStoredBodies(this.db, {
      warn: (message) => this.logger.warn(message),
    });
    if (stats.indexed > 0) {
      this.logStats('skills in-place reparse', stats);
    }
  }

  private async executeReindex(): Promise<ReindexStats> {
    return runKnowledgeReindex(this.db, {
      workspaceRoot: this.workspaceRoot(),
      writeAgentRoutes: this.writeAgentRoutes(),
    });
  }

  private async isThrottled(): Promise<boolean> {
    const client = this.redisFactory.getClient(0);
    const raw = await client.get(knowledgeApiRedisKey.reindexLastAt());
    if (!raw) {
      return false;
    }
    const lastAt = Number(raw);
    if (!Number.isFinite(lastAt)) {
      return false;
    }
    const elapsedSec = (Date.now() - lastAt) / 1000;
    return elapsedSec < this.minIntervalSec();
  }

  private async recordLastReindexAt(): Promise<void> {
    const client = this.redisFactory.getClient(0);
    const ttl = this.minIntervalSec();
    await client.set(
      knowledgeApiRedisKey.reindexLastAt(),
      String(Date.now()),
      ttl,
    );
  }

  private async tryAcquireLock(): Promise<(() => Promise<void>) | null> {
    const client = this.redisFactory.getClient(0);
    const key = knowledgeApiRedisKey.reindexLock();
    const token = randomUUID();
    const ok = await client.trySetNx(key, token, this.lockTtlSec());
    if (!ok) {
      return null;
    }
    return async () => {
      await client.releaseLockIfValue(key, token);
    };
  }

  private logStats(label: string, stats: ReindexStats): void {
    this.logger.log(
      `${label}: indexed=${stats.indexed} skipped=${stats.skipped} deleted=${stats.deleted} chunks=${stats.chunks} durationMs=${stats.durationMs}`,
    );
  }
}
