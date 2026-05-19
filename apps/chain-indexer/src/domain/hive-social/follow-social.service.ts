import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CustomJsonOperation } from '@hiveio/dhive/lib/chain/operation';
import { SocialGraphRepository } from '../../repositories/social-graph.repository';
import type { HiveOperationHandlerContext } from '../hive-parser/hive-handler-context';
import {
  firstWhatToken,
  parseCustomJsonInner,
  parseFollowCustomJsonArray,
} from './follow-json.parse';
import { ReblogSocialService } from './reblog-social.service';
import {
  FOLLOW_NOTIFICATION_EVENT,
  FollowNotificationPayload,
  TRX_PROCESSED_NOTIFICATION_EVENT,
  TrxProcessedNotificationPayload,
} from '../notification-adapter/events/notification-domain-events';

@Injectable()
export class FollowSocialService {
  private readonly logger = new Logger(FollowSocialService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly socialGraph: SocialGraphRepository,
    private readonly reblogSocial: ReblogSocialService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private isFollowHandlerEnabled(): boolean {
    if (this.configService.get<boolean>('hive.handlers.customJson.enabled') === false) {
      return false;
    }
    return this.configService.get<boolean>('hive.handlers.hiveFollowEnabled') !== false;
  }

  private transactionAccount(payload: CustomJsonOperation[1]): string {
    const posting = payload.required_posting_auths?.[0];
    const auth = payload.required_auths?.[0];
    return posting ?? auth ?? '';
  }

  async handleFollowCustomJson(
    payload: CustomJsonOperation[1],
    context: HiveOperationHandlerContext,
  ): Promise<void> {
    if (!this.isFollowHandlerEnabled()) {
      return;
    }
    const inner = parseCustomJsonInner(payload.json);
    const parsed = parseFollowCustomJsonArray(inner);
    if (!parsed) {
      this.logger.warn('Hive follow custom_json: invalid or empty JSON');
      return;
    }

    const signer = this.transactionAccount(payload);
    if (!signer) {
      this.logger.warn('Hive follow custom_json: missing signer');
      return;
    }

    if (parsed.kind === 'reblog') {
      if (signer !== parsed.account) {
        this.logger.warn('Hive follow custom_json: reblog signer mismatch');
        return;
      }
      await this.reblogSocial.applyReblogFromFollowPayload(parsed, context);
      return;
    }

    if (signer !== parsed.follower) {
      this.logger.warn('Hive follow custom_json: follow signer mismatch');
      return;
    }

    const w = firstWhatToken(parsed.what);
    const nonEmptyWhat = parsed.what.length > 0 && w !== null;

    if (nonEmptyWhat && parsed.follower === parsed.following) {
      this.logger.warn('Hive follow custom_json: self-follow rejected');
      return;
    }

    if (w === 'blog') {
      await this.applyFollowBlog(parsed.follower, parsed.following, context);
      return;
    }
    if (w === 'ignore') {
      await this.applyIgnore(parsed.follower, parsed.following, context);
      return;
    }
    if (w === null) {
      await this.applyUnfollowOrClearMute(parsed.follower, parsed.following, context);
      return;
    }
    /* other what values: silent no-op per spec */
  }

  private async applyFollowBlog(
    follower: string,
    following: string,
    context: HiveOperationHandlerContext,
  ): Promise<void> {
    let created = false;
    await this.socialGraph.runInTransaction(async (trx) => {
      const exists = await this.socialGraph.subscriptionExists(follower, following, trx);
      if (exists) {
        return;
      }
      created = true;
      await this.socialGraph.incrementFollowRelationshipCounts(follower, following, trx);
      const muted = await this.socialGraph.muteExists(follower, following, trx);
      if (muted) {
        await this.socialGraph.deleteMute(follower, following, trx);
      }
      await this.socialGraph.insertSubscription(
        { follower, following, bell: null },
        trx,
      );
    });
    if (created) {
      this.emitFollowNotification(follower, following, 'follow', context);
    }
    this.emitTrxProcessed(context);
  }

  private async applyIgnore(
    follower: string,
    following: string,
    context: HiveOperationHandlerContext,
  ): Promise<void> {
    await this.socialGraph.runInTransaction(async (trx) => {
      await this.socialGraph.insertMute({ muter: follower, muted: following }, trx);
      const sub = await this.socialGraph.subscriptionExists(follower, following, trx);
      if (sub) {
        await this.socialGraph.decrementFollowRelationshipCounts(follower, following, trx);
        await this.socialGraph.deleteSubscription(follower, following, trx);
      }
    });
    this.emitTrxProcessed(context);
  }

  private async applyUnfollowOrClearMute(
    follower: string,
    following: string,
    context: HiveOperationHandlerContext,
  ): Promise<void> {
    let unfollowed = false;
    await this.socialGraph.runInTransaction(async (trx) => {
      await this.socialGraph.deleteMute(follower, following, trx);
      const sub = await this.socialGraph.subscriptionExists(follower, following, trx);
      if (sub) {
        unfollowed = true;
        await this.socialGraph.decrementFollowRelationshipCounts(follower, following, trx);
        await this.socialGraph.deleteSubscription(follower, following, trx);
      }
    });
    if (unfollowed) {
      this.emitFollowNotification(follower, following, 'unfollow', context);
    }
    this.emitTrxProcessed(context);
  }

  private emitFollowNotification(
    follower: string,
    following: string,
    action: 'follow' | 'unfollow',
    context: HiveOperationHandlerContext,
  ): void {
    this.eventEmitter.emit(
      FOLLOW_NOTIFICATION_EVENT,
      new FollowNotificationPayload(
        follower,
        following,
        action,
        context.blockNum,
        context.transaction.transaction_id,
        context.timestamp,
      ),
    );
  }

  private emitTrxProcessed(context: HiveOperationHandlerContext): void {
    this.eventEmitter.emit(
      TRX_PROCESSED_NOTIFICATION_EVENT,
      new TrxProcessedNotificationPayload(
        context.transaction.transaction_id,
        context.blockNum,
        context.timestamp,
      ),
    );
  }
}
