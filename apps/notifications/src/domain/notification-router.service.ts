import { Injectable, Logger } from '@nestjs/common';
import type { NotificationEvent } from '@opden-data-layer/notifications-contract';
import { NotificationRecipientsRepository } from '../repositories/notification-recipients.repository';
import { SubscriptionService } from '../ws/subscription.service';
import { NotificationFeedService } from './notification-feed.service';

@Injectable()
export class NotificationRouterService {
  private readonly logger = new Logger(NotificationRouterService.name);

  constructor(
    private readonly recipientsRepository: NotificationRecipientsRepository,
    private readonly feedService: NotificationFeedService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async route(event: NotificationEvent): Promise<void> {
    switch (event.type) {
      case 'trx_processed':
        this.routeTrxProcessed(event);
        return;
      case 'object_created':
        return;
      case 'follow':
        await this.routeFollow(event);
        return;
      case 'update_vote_cast':
        await this.routeVoteCast(event);
        return;
      case 'batch_import_completed':
        await this.routeBatchImportCompleted(event);
        return;
      default:
        this.logger.warn(`Unknown notification event type: ${event.type}`);
    }
  }

  private routeTrxProcessed(event: NotificationEvent): void {
    const trxId = event.trxId;
    if (!trxId) {
      return;
    }
    this.subscriptionService.notifyTrxProcessed(trxId, {
      blockNum: event.blockNum,
      occurredAt: event.occurredAt,
    });
  }

  private async routeBatchImportCompleted(event: NotificationEvent): Promise<void> {
    const creator = event.actor;
    if (!creator) {
      return;
    }
    const item = this.feedService.buildItemFromEvent(event);
    await this.feedService.addToFeed(creator, item);
  }

  private async routeFollow(event: NotificationEvent): Promise<void> {
    const following = event.payload.following;
    if (typeof following !== 'string' || following.trim().length === 0) {
      return;
    }
    const item = this.feedService.buildItemFromEvent(event);
    await this.feedService.addToFeed(following.trim(), item);
  }

  private async routeVoteCast(event: NotificationEvent): Promise<void> {
    const objectId = event.objectId;
    if (!objectId) {
      return;
    }

    const [creator, authorities, bellFollowers] = await Promise.all([
      this.recipientsRepository.findObjectCreator(objectId),
      this.recipientsRepository.findAdministrativeAuthorities(objectId),
      this.recipientsRepository.findBellFollowers(objectId),
    ]);

    const recipients = new Set<string>();
    if (creator) {
      recipients.add(creator);
    }
    for (const account of authorities) {
      recipients.add(account);
    }
    for (const account of bellFollowers) {
      recipients.add(account);
    }

    if (event.actor) {
      recipients.delete(event.actor);
    }

    if (recipients.size === 0) {
      return;
    }

    const item = this.feedService.buildItemFromEvent(event);
    await Promise.all(
      [...recipients].map((username) =>
        this.feedService.addToFeed(username, item),
      ),
    );
  }
}
