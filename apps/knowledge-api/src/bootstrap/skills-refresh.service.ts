import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { RedisClientFactory } from '@opden-data-layer/clients';
import {
  downloadSkillsArchive,
  fetchSkillsHeadSha,
  reindexSkills,
  SkillsSourceError,
  validateSkillsRoot,
  type KnowledgeDatabase,
  type ReindexStats,
} from '@opden-data-layer/knowledge';
import type { Kysely } from 'kysely';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  SKILLS_REFRESH_INTERVAL_NAME,
  SKILLS_REFRESH_LOCK_TTL_SEC,
  SKILLS_STATE_TTL_SEC,
} from '../constants/reindex';
import { knowledgeApiRedisKey } from '../constants/redis-keys';
import { KYSELY } from '../database/database.module';

@Injectable()
export class SkillsRefreshService implements OnModuleDestroy {
  private readonly logger = new Logger(SkillsRefreshService.name);
  private started = false;

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<KnowledgeDatabase>,
    private readonly config: ConfigService,
    private readonly redisFactory: RedisClientFactory,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  snapshotDir(): string {
    return this.config.getOrThrow<string>('knowledge.skillsSnapshotDir');
  }

  startAfterListen(): void {
    if (!this.remoteEnabled() || this.started) {
      return;
    }
    this.started = true;
    void this.refreshIfDue();

    const intervalSec = this.refreshIntervalSec();
    if (intervalSec <= 0) {
      return;
    }
    const id = setInterval(() => {
      void this.refreshIfDue();
    }, intervalSec * 1000);
    this.schedulerRegistry.addInterval(SKILLS_REFRESH_INTERVAL_NAME, id);
  }

  onModuleDestroy(): void {
    try {
      this.schedulerRegistry.deleteInterval(SKILLS_REFRESH_INTERVAL_NAME);
    } catch {
      // Not registered (tests without ScheduleModule, or interval disabled).
    }
  }

  async seedFromSnapshot(): Promise<void> {
    const snapshotDir = this.snapshotDir();
    const sha = await validateSkillsRoot(snapshotDir);
    if (!sha) {
      this.logger.error(
        `Skills snapshot missing or invalid at ${snapshotDir}`,
      );
      return;
    }
    const stats = await reindexSkills(this.db, {
      skillsRoot: snapshotDir,
      warn: (message) => this.logger.warn(message),
    });
    await this.storeSha(sha);
    this.logStats('skills snapshot seed', stats);
  }

  async refreshIfDue(): Promise<void> {
    const release = await this.tryAcquireLock();
    if (!release) {
      this.logger.debug('Skills refresh skipped (lock held by another instance)');
      return;
    }

    let tmpDir: string | null = null;
    try {
      const storedSha = await this.readStoredSha();
      const storedEtag = await this.readStoredEtag();
      const head = await fetchSkillsHeadSha({
        repo: this.repo(),
        branch: this.branch(),
        etag: storedEtag ?? undefined,
        token: this.token(),
      });

      if (head.status === 'unchanged') {
        await this.refreshStateTtl();
        this.logger.debug('Skills refresh unchanged (304)');
        return;
      }

      if (head.sha === storedSha) {
        await this.storeEtag(head.etag);
        this.logger.debug('Skills refresh same sha with new etag');
        return;
      }

      tmpDir = await mkdtemp(path.join(os.tmpdir(), 'odl-skills-'));
      await downloadSkillsArchive({
        repo: this.repo(),
        sha: head.sha,
        destDir: tmpDir,
        token: this.token(),
      });
      const downloadedSha = await validateSkillsRoot(tmpDir);
      if (!downloadedSha) {
        throw new SkillsSourceError(
          'invalid_archive',
          'Downloaded skills archive failed validation',
        );
      }
      const stats = await reindexSkills(this.db, {
        skillsRoot: tmpDir,
        warn: (message) => this.logger.warn(message),
      });
      await this.storeSha(downloadedSha, head.etag);
      this.logStats('skills remote refresh', stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Skills refresh failed; keeping current index: ${message}`);
    } finally {
      if (tmpDir) {
        await rm(tmpDir, { recursive: true, force: true });
      }
      await release();
    }
  }

  private remoteEnabled(): boolean {
    return this.config.get<boolean>('knowledge.skillsRemoteEnabled') === true;
  }

  private repo(): string {
    return this.config.getOrThrow<string>('knowledge.skillsRepo');
  }

  private branch(): string {
    return this.config.getOrThrow<string>('knowledge.skillsBranch');
  }

  private token(): string | undefined {
    return this.config.get<string>('knowledge.githubToken') || undefined;
  }

  private refreshIntervalSec(): number {
    const raw = this.config.get<number>('knowledge.skillsRefreshIntervalSec', 300);
    if (!Number.isFinite(raw)) {
      return 300;
    }
    return Math.max(60, raw);
  }

  private async readStoredSha(): Promise<string | null> {
    const client = this.redisFactory.getClient(0);
    return client.get(knowledgeApiRedisKey.skillsSha());
  }

  private async readStoredEtag(): Promise<string | null> {
    const client = this.redisFactory.getClient(0);
    return client.get(knowledgeApiRedisKey.skillsEtag());
  }

  async storeSha(sha: string, etag?: string | null): Promise<void> {
    const client = this.redisFactory.getClient(0);
    await client.set(knowledgeApiRedisKey.skillsSha(), sha, SKILLS_STATE_TTL_SEC);
    if (etag) {
      await client.set(knowledgeApiRedisKey.skillsEtag(), etag, SKILLS_STATE_TTL_SEC);
    }
  }

  private async storeEtag(etag: string | undefined): Promise<void> {
    await this.refreshStateTtl();
    if (!etag) {
      return;
    }
    const client = this.redisFactory.getClient(0);
    await client.set(knowledgeApiRedisKey.skillsEtag(), etag, SKILLS_STATE_TTL_SEC);
  }

  private async refreshStateTtl(): Promise<void> {
    const client = this.redisFactory.getClient(0);
    await client.expire(knowledgeApiRedisKey.skillsSha(), SKILLS_STATE_TTL_SEC);
    await client.expire(knowledgeApiRedisKey.skillsEtag(), SKILLS_STATE_TTL_SEC);
  }

  private async tryAcquireLock(): Promise<(() => Promise<void>) | null> {
    const client = this.redisFactory.getClient(0);
    const key = knowledgeApiRedisKey.skillsRefreshLock();
    const token = randomUUID();
    const ok = await client.trySetNx(key, token, SKILLS_REFRESH_LOCK_TTL_SEC);
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
