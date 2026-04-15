import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { AccountSyncQueueRow } from '@opden-data-layer/core';
import { HiveClient } from '@opden-data-layer/clients';
import { AccountSyncQueueRepository } from '../../repositories/account-sync-queue.repository';
import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import { SocialGraphRepository } from '../../repositories/social-graph.repository';

const DEFAULT_ACCOUNT_SYNC_INTERVAL_MS = 30_000;
const DEFAULT_ACCOUNT_SYNC_BATCH_SIZE = 20;
const DEFAULT_ACCOUNT_SYNC_MAX_ATTEMPTS = 5;
const ACCOUNT_SYNC_RETRY_AFTER_SEC = 60;
const FOLLOW_PAGE_SIZE = 1000;

const ACCOUNT_SYNC_INTERVAL_NAME = 'accountSync';

function isBlogFollow(what: string[] | undefined): boolean {
  return Array.isArray(what) && what.includes('blog');
}

@Injectable()
export class AccountSyncWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountSyncWorker.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly accountSyncQueueRepository: AccountSyncQueueRepository,
    private readonly accountsCurrentRepository: AccountsCurrentRepository,
    private readonly socialGraphRepository: SocialGraphRepository,
    private readonly hiveClient: HiveClient,
  ) {}

  onModuleInit(): void {
    const raw = this.configService.get<number>(
      'accountSync.intervalMs',
      DEFAULT_ACCOUNT_SYNC_INTERVAL_MS,
    );
    const intervalMs =
      Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_ACCOUNT_SYNC_INTERVAL_MS;
    const id = setInterval(() => {
      void this.runAccountSyncBatch();
    }, intervalMs);
    this.schedulerRegistry.addInterval(ACCOUNT_SYNC_INTERVAL_NAME, id);
  }

  onModuleDestroy(): void {
    try {
      this.schedulerRegistry.deleteInterval(ACCOUNT_SYNC_INTERVAL_NAME);
    } catch {
      // Not registered (e.g. tests without ScheduleModule).
    }
  }

  async runAccountSyncBatch(): Promise<void> {
    const batchSize = this.configService.get<number>(
      'accountSync.batchSize',
      DEFAULT_ACCOUNT_SYNC_BATCH_SIZE,
    );
    const maxAttempts = this.configService.get<number>(
      'accountSync.maxAttempts',
      DEFAULT_ACCOUNT_SYNC_MAX_ATTEMPTS,
    );

    const tasks = await this.accountSyncQueueRepository.claimBatch(
      batchSize,
      ACCOUNT_SYNC_RETRY_AFTER_SEC,
    );

    for (const task of tasks) {
      await this.processTask(task, maxAttempts);
    }
  }

  private async collectFollowersBlog(
    account: string,
  ): Promise<{ follower: string; following: string }[]> {
    const out: { follower: string; following: string }[] = [];
    let start: string | null = null;
    for (;;) {
      const page = await this.hiveClient.getFollowers(
        account,
        start,
        'blog',
        FOLLOW_PAGE_SIZE,
      );
      if (page.length === 0) {
        break;
      }
      for (const r of page) {
        if (isBlogFollow(r.what)) {
          out.push({ follower: r.follower, following: r.following });
        }
      }
      if (page.length < FOLLOW_PAGE_SIZE) {
        break;
      }
      const last = page[page.length - 1];
      if (!last) {
        break;
      }
      start = last.follower;
    }
    return out;
  }

  private async collectFollowingBlog(
    account: string,
  ): Promise<{ follower: string; following: string }[]> {
    const out: { follower: string; following: string }[] = [];
    let start: string | null = null;
    for (;;) {
      const page = await this.hiveClient.getFollowing(
        account,
        start,
        'blog',
        FOLLOW_PAGE_SIZE,
      );
      if (page.length === 0) {
        break;
      }
      for (const r of page) {
        if (isBlogFollow(r.what)) {
          out.push({ follower: r.follower, following: r.following });
        }
      }
      if (page.length < FOLLOW_PAGE_SIZE) {
        break;
      }
      const last = page[page.length - 1];
      if (!last) {
        break;
      }
      start = last.following;
    }
    return out;
  }

  private async processTask(
    task: AccountSyncQueueRow,
    maxAttempts: number,
  ): Promise<void> {
    const accountName = task.account_name;

    try {
      const accounts = await this.hiveClient.getAccounts([accountName]);
      const hive = accounts[0];
      if (!hive?.name) {
        this.logger.warn(
          `Account sync: Hive returned no account ${accountName} (attempt ${task.attempts})`,
        );
        if (task.attempts >= maxAttempts) {
          await this.accountSyncQueueRepository.deleteOne(accountName);
        } else {
          await this.accountSyncQueueRepository.resetAttempt(accountName);
        }
        return;
      }

      await this.accountsCurrentRepository.upsertFromHive(hive);

      const followersRows = await this.collectFollowersBlog(accountName);
      const followingRows = await this.collectFollowingBlog(accountName);
      await this.socialGraphRepository.bulkInsertSubscriptions(followersRows);
      await this.socialGraphRepository.bulkInsertSubscriptions(followingRows);

      const muted = await this.hiveClient.getMutedList(accountName);
      const muteRows = muted
        .map((m) => m.name?.trim())
        .filter((n): n is string => Boolean(n))
        .map((mutedName) => ({ muter: accountName, muted: mutedName }));
      await this.socialGraphRepository.bulkInsertMutes(muteRows);

      await this.accountSyncQueueRepository.deleteOne(accountName);
    } catch (error: unknown) {
      this.logger.error(
        `Account sync failed ${accountName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.accountSyncQueueRepository.resetAttempt(accountName);
    }
  }
}
