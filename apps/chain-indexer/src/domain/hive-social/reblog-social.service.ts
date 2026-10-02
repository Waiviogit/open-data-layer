import { Injectable, Logger } from '@nestjs/common';
import { PostSyncQueueRepository } from '../../repositories/post-sync-queue.repository';
import { PostReblogPendingRepository } from '../../repositories/post-reblog-pending.repository';
import { PostsRepository } from '../../repositories/posts.repository';
import type { HiveOperationHandlerContext } from '../hive-parser/hive-handler-context';
import { blockTimestampToUnixSeconds } from '@opden-data-layer/core';
import type { ReblogBranchPayload } from './follow-json.parse';
import { AccountEnsureService } from './account-ensure.service';
import { NotificationEmitterService } from '../notification-adapter/notification-emitter.service';

@Injectable()
export class ReblogSocialService {
  private readonly logger = new Logger(ReblogSocialService.name);

  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly postSyncQueueRepository: PostSyncQueueRepository,
    private readonly postReblogPendingRepository: PostReblogPendingRepository,
    private readonly accountEnsure: AccountEnsureService,
    private readonly notificationEmitter: NotificationEmitterService,
  ) {}

  async applyReblogFromFollowPayload(
    payload: ReblogBranchPayload,
    context: HiveOperationHandlerContext,
  ): Promise<void> {
    const reblogger = payload.account;
    const srcAuthor = payload.author;
    const srcPermlink = payload.permlink;

    if (!reblogger || !srcAuthor || !srcPermlink) {
      return;
    }
    if (reblogger === srcAuthor) {
      return;
    }

    const source = await this.postsRepository.findSourcePostForReblog(
      srcAuthor,
      srcPermlink,
    );
    if (!source) {
      this.logger.warn(
        `Reblog: source post not found ${srcAuthor}/${srcPermlink}`,
      );
      const enqueuedAt = blockTimestampToUnixSeconds(context.timestamp);
      await this.postReblogPendingRepository.upsert({
        author: srcAuthor,
        permlink: srcPermlink,
        account: reblogger,
        reblogged_at_unix: enqueuedAt,
      });
      await this.postSyncQueueRepository.enqueue(
        srcAuthor,
        srcPermlink,
        enqueuedAt,
        true,
      );
      return;
    }

    const rebloggedAtUnix = blockTimestampToUnixSeconds(context.timestamp);

    await this.accountEnsure.ensureUserExists(reblogger, rebloggedAtUnix);

    await this.postsRepository.insertRebloggedUser({
      author: source.author,
      permlink: source.permlink,
      account: reblogger,
      reblogged_at_unix: rebloggedAtUnix,
    });

    this.notificationEmitter.emitWithContext(
      this.notificationEmitter.hiveContext(context),
      {
        type: 'reblog',
        objectId: null,
        actor: reblogger,
        payload: {
          account: reblogger,
          author: srcAuthor,
          permlink: srcPermlink,
          title: source.title ?? null,
        },
      },
    );

    this.notificationEmitter.emitWithContext(
      this.notificationEmitter.hiveContext(context),
      {
        type: 'bell_reblog',
        objectId: null,
        actor: reblogger,
        payload: {
          account: reblogger,
          author: srcAuthor,
          permlink: srcPermlink,
          title: source.title ?? null,
        },
      },
    );
  }
}
