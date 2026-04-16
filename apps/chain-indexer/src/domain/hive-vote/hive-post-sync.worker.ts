import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { PostSyncQueueRow } from '@opden-data-layer/core';
import { HiveClient } from '@opden-data-layer/clients';
import { PostSyncQueueRepository } from '../../repositories/post-sync-queue.repository';
import { PostsRepository } from '../../repositories/posts.repository';
import { PostUpsertService } from '../hive-comment/post-upsert.service';

const DEFAULT_POST_SYNC_INTERVAL_MS = 30_000;
const DEFAULT_POST_SYNC_BATCH_SIZE = 50;
const DEFAULT_POST_SYNC_MAX_ATTEMPTS = 5;
const POST_SYNC_RETRY_AFTER_SEC = 60;

const HIVE_POST_SYNC_INTERVAL_NAME = 'hivePostSync';

@Injectable()
export class HivePostSyncWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HivePostSyncWorker.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly postSyncQueueRepository: PostSyncQueueRepository,
    private readonly postsRepository: PostsRepository,
    private readonly postUpsertService: PostUpsertService,
    private readonly hiveClient: HiveClient,
  ) {}

  onModuleInit(): void {
    const raw = this.configService.get<number>(
      'postSync.intervalMs',
      DEFAULT_POST_SYNC_INTERVAL_MS,
    );
    const intervalMs =
      Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_POST_SYNC_INTERVAL_MS;
    const id = setInterval(() => {
      void this.runPostSyncBatch();
    }, intervalMs);
    this.schedulerRegistry.addInterval(HIVE_POST_SYNC_INTERVAL_NAME, id);
  }

  onModuleDestroy(): void {
    try {
      this.schedulerRegistry.deleteInterval(HIVE_POST_SYNC_INTERVAL_NAME);
    } catch {
      // Not registered (e.g. tests without ScheduleModule).
    }
  }

  async runPostSyncBatch(): Promise<void> {
    const batchSize = this.configService.get<number>(
      'postSync.batchSize',
      DEFAULT_POST_SYNC_BATCH_SIZE,
    );
    const maxAttempts = this.configService.get<number>(
      'postSync.maxAttempts',
      DEFAULT_POST_SYNC_MAX_ATTEMPTS,
    );

    const tasks = await this.postSyncQueueRepository.claimBatch(
      batchSize,
      POST_SYNC_RETRY_AFTER_SEC,
    );

    for (const task of tasks) {
      await this.processTask(task, maxAttempts);
    }
  }

  private async processTask(
    task: PostSyncQueueRow,
    maxAttempts: number,
  ): Promise<void> {
    const { author, permlink, enqueued_at: enqueuedAt, needs_post_create: needsPostCreate } =
      task;
    const blockIso = new Date(enqueuedAt * 1000).toISOString();

    if (needsPostCreate) {
      try {
        const result = await this.postUpsertService.ensurePostFromHiveForVoteSync(
          author,
          permlink,
          blockIso,
        );
        if (result === 'is_comment') {
          this.logger.log(
            `Sync queue: ${author}/${permlink} is a comment (depth > 0), skipping vote sync`,
          );
          await this.postSyncQueueRepository.deleteOne(author, permlink);
          return;
        }
        if (result === 'muted') {
          this.logger.log(
            `Sync queue: ${author}/${permlink} author is governance-muted; skipping vote sync`,
          );
          await this.postSyncQueueRepository.deleteOne(author, permlink);
          return;
        }
        if (result === 'not_found') {
          this.logger.warn(
            `Hive post not found for sync queue ${author}/${permlink} (attempt ${task.attempts})`,
          );
          if (task.attempts >= maxAttempts) {
            await this.postSyncQueueRepository.deleteOne(author, permlink);
          } else {
            await this.postSyncQueueRepository.resetAttempt(author, permlink);
          }
          return;
        }
      } catch (error: unknown) {
        this.logger.error(
          `ensurePostFromHiveForVoteSync failed ${author}/${permlink}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await this.postSyncQueueRepository.resetAttempt(author, permlink);
        return;
      }
    }

    try {
      const votes = await this.hiveClient.getActiveVotes(author, permlink);
      await this.postsRepository.syncActiveVotesFromHive(author, permlink, votes);
      await this.postSyncQueueRepository.deleteOne(author, permlink);
    } catch (error: unknown) {
      this.logger.error(
        `Hive getActiveVotes failed ${author}/${permlink}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.postSyncQueueRepository.resetAttempt(author, permlink);
    }
  }
}
