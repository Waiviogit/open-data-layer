import { Injectable } from '@nestjs/common';
import type { AnyNotificationEvent } from '@opden-data-layer/notifications-contract';
import { NotificationRecipientsRepository } from '../../repositories/notification-recipients.repository';
import type { RecipientStrategy } from './recipient.strategy';

function sameHiveAccount(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

@Injectable()
export class DirectRecipientStrategy implements RecipientStrategy {
  private readonly types = new Set<AnyNotificationEvent['type']>([
    'follow',
    'batch_import_completed',
    'transfer_in',
    'transfer_out',
    'transfer_from_savings',
    'power_up',
    'power_down',
    'claim_reward',
    'witness_vote',
    'fill_order',
    'withdraw_route',
    'change_recovery_account',
    'change_password',
    'hp_delegation',
    'engine_transfer',
    'engine_transfer_out',
    'engine_swap',
    'engine_stake',
    'engine_unstake',
    'engine_cancel_unstake',
    'engine_delegate',
    'engine_undelegate',
  ]);

  supports(type: AnyNotificationEvent['type']): boolean {
    return this.types.has(type);
  }

  async resolveRecipients(event: AnyNotificationEvent): Promise<string[]> {
    switch (event.type) {
      case 'follow':
        return [event.payload.following];
      case 'batch_import_completed':
        return event.actor ? [event.actor] : [];
      case 'transfer_in':
        return [event.payload.to];
      case 'transfer_out':
        if (sameHiveAccount(event.payload.from, event.payload.to)) {
          return [];
        }
        return [event.payload.from];
      case 'transfer_from_savings':
        return [event.payload.from];
      case 'power_up':
        return [event.payload.to];
      case 'power_down':
        return [event.payload.account];
      case 'claim_reward':
        return event.actor ? [event.actor] : [];
      case 'witness_vote':
        return [event.payload.witness];
      case 'fill_order':
        return event.actor ? [event.actor] : [];
      case 'withdraw_route':
        return [event.payload.fromAccount, event.payload.toAccount];
      case 'change_recovery_account':
      case 'change_password':
        return [event.payload.account];
      case 'hp_delegation':
        if (event.payload.amount === '0') {
          return [event.payload.delegator];
        }
        return [event.payload.delegatee];
      case 'engine_transfer':
        return [event.payload.to];
      case 'engine_transfer_out':
        if (sameHiveAccount(event.payload.from, event.payload.to)) {
          return [];
        }
        return [event.payload.from];
      case 'engine_swap':
        return [event.payload.account];
      case 'engine_stake':
        return [event.payload.to];
      case 'engine_unstake':
      case 'engine_cancel_unstake':
        return [event.payload.account];
      case 'engine_delegate':
        return [event.payload.to];
      case 'engine_undelegate':
        return event.actor ? [event.actor] : [event.payload.from];
      default:
        return [];
    }
  }
}

@Injectable()
export class PostAuthorRecipientStrategy implements RecipientStrategy {
  private readonly types = new Set<AnyNotificationEvent['type']>([
    'reply',
    'mention',
    'vote_like',
    'vote_downvote',
    'reblog',
  ]);

  supports(type: AnyNotificationEvent['type']): boolean {
    return this.types.has(type);
  }

  async resolveRecipients(event: AnyNotificationEvent): Promise<string[]> {
    switch (event.type) {
      case 'reply':
        return [event.payload.parentAuthor];
      case 'mention':
        return [event.payload.mentioned];
      case 'vote_like':
      case 'vote_downvote':
        return [event.payload.author];
      case 'reblog':
        return [event.payload.author];
      default:
        return [];
    }
  }
}

@Injectable()
export class SelfActorRecipientStrategy implements RecipientStrategy {
  private readonly types = new Set<AnyNotificationEvent['type']>([
    'my_post',
    'my_comment',
    'my_vote',
  ]);

  supports(type: AnyNotificationEvent['type']): boolean {
    return this.types.has(type);
  }

  async resolveRecipients(event: AnyNotificationEvent): Promise<string[]> {
    return event.actor ? [event.actor] : [];
  }
}

@Injectable()
export class ObjectAudienceRecipientStrategy implements RecipientStrategy {
  private readonly types = new Set<AnyNotificationEvent['type']>([
    'update_vote_cast',
    'object_update',
    'object_update_reject',
    'object_status_change',
    'object_created',
  ]);

  constructor(
    private readonly recipientsRepository: NotificationRecipientsRepository,
  ) {}

  supports(type: AnyNotificationEvent['type']): boolean {
    return this.types.has(type);
  }

  async resolveRecipients(event: AnyNotificationEvent): Promise<string[]> {
    const objectId = event.objectId;
    if (!objectId) {
      return [];
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
    if (event.type === 'object_update_reject' && event.payload.voter) {
      recipients.add(event.payload.voter);
    }
    if (event.actor) {
      recipients.delete(event.actor);
    }
    return [...recipients];
  }
}

@Injectable()
export class UserBellRecipientStrategy implements RecipientStrategy {
  private readonly types = new Set<AnyNotificationEvent['type']>([
    'bell_post',
    'bell_reblog',
    'bell_follow',
    'bell_object_post',
    'bell_thread',
  ]);

  constructor(
    private readonly recipientsRepository: NotificationRecipientsRepository,
  ) {}

  supports(type: AnyNotificationEvent['type']): boolean {
    return this.types.has(type);
  }

  async resolveRecipients(event: AnyNotificationEvent): Promise<string[]> {
    switch (event.type) {
      case 'bell_post':
      case 'bell_reblog':
      case 'bell_thread': {
        const author =
          event.type === 'bell_reblog'
            ? event.payload.author
            : event.payload.author;
        return this.recipientsRepository.findAccountBellSubscribers(author);
      }
      case 'bell_follow':
        return [event.payload.following];
      case 'bell_object_post':
        return this.recipientsRepository.findBellFollowers(
          event.payload.wobjectPermlink,
        );
      default:
        return [];
    }
  }
}

@Injectable()
export class ThreadAuthorFollowerRecipientStrategy implements RecipientStrategy {
  private readonly types = new Set<AnyNotificationEvent['type']>([
    'thread_author_follower',
  ]);

  constructor(
    private readonly recipientsRepository: NotificationRecipientsRepository,
  ) {}

  supports(type: AnyNotificationEvent['type']): boolean {
    return this.types.has(type);
  }

  async resolveRecipients(event: AnyNotificationEvent): Promise<string[]> {
    if (event.type !== 'thread_author_follower') {
      return [];
    }
    const recipients = new Set<string>();
    for (const mention of event.payload.mentions) {
      if (mention.trim()) {
        recipients.add(mention.trim());
      }
    }
    const bellSubs = await this.recipientsRepository.findAccountBellSubscribers(
      event.payload.author,
    );
    for (const account of bellSubs) {
      recipients.add(account);
    }
    if (event.actor) {
      recipients.delete(event.actor);
    }
    return [...recipients];
  }
}

@Injectable()
export class ChannelMessagingRecipientStrategy implements RecipientStrategy {
  private readonly types = new Set<AnyNotificationEvent['type']>([
    'message_direct',
    'message_group',
    'bell_object_message',
  ]);

  constructor(
    private readonly recipientsRepository: NotificationRecipientsRepository,
  ) {}

  supports(type: AnyNotificationEvent['type']): boolean {
    return this.types.has(type);
  }

  async resolveRecipients(event: AnyNotificationEvent): Promise<string[]> {
    switch (event.type) {
      case 'message_direct':
      case 'message_group': {
        const members = await this.recipientsRepository.findChannelMembers(
          event.payload.channelId,
        );
        const recipients = new Set(members);
        if (event.actor) {
          recipients.delete(event.actor);
        }
        return [...recipients];
      }
      case 'bell_object_message': {
        if (!event.objectId) {
          return [];
        }
        const bellFollowers = await this.recipientsRepository.findBellFollowers(
          event.objectId,
        );
        const recipients = new Set(bellFollowers);
        if (event.actor) {
          recipients.delete(event.actor);
        }
        return [...recipients];
      }
      default:
        return [];
    }
  }
}

@Injectable()
export class OblRecipientStrategy implements RecipientStrategy {
  private readonly types = new Set<AnyNotificationEvent['type']>([
    'obl_offer_publish',
    'obl_offer_update',
    'obl_offer_retire',
    'obl_contract_sign',
    'obl_service_order_create',
    'obl_report_create',
    'obl_invoice_issue',
    'obl_payment_declare',
    'obl_payment_confirm',
    'obl_dispute_open',
    'obl_dispute_resolve',
  ]);

  supports(type: AnyNotificationEvent['type']): boolean {
    return this.types.has(type);
  }

  async resolveRecipients(event: AnyNotificationEvent): Promise<string[]> {
    switch (event.type) {
      case 'obl_offer_publish':
      case 'obl_offer_update':
        return uniqueAccounts(
          event.actor,
          event.payload.author,
          event.payload.arbiter,
        );
      case 'obl_offer_retire':
        return uniqueAccounts(event.actor, event.payload.author);
      case 'obl_contract_sign':
        return uniqueAccounts(
          event.actor,
          event.payload.provider,
          event.payload.client,
        );
      case 'obl_service_order_create':
        return uniqueAccounts(
          event.actor,
          event.payload.provider,
          event.payload.client,
        );
      case 'obl_report_create':
        return uniqueAccounts(
          event.actor,
          event.payload.provider,
          event.payload.client,
        );
      case 'obl_invoice_issue':
        return uniqueAccounts(
          event.actor,
          event.payload.issuer,
          event.payload.debtor,
          event.payload.beneficiaries,
        );
      case 'obl_payment_declare':
      case 'obl_payment_confirm':
        return uniqueAccounts(
          event.actor,
          event.payload.payer,
          event.payload.receiver,
        );
      case 'obl_dispute_open':
      case 'obl_dispute_resolve':
        return uniqueAccounts(
          event.actor,
          event.payload.disputant,
          event.payload.resolver,
          event.payload.debtor,
          event.payload.beneficiaries,
        );
      default:
        return [];
    }
  }
}

function uniqueAccounts(
  ...values: Array<string | null | undefined | readonly string[]>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (typeof item !== 'string') {
        continue;
      }
      const trimmed = item.trim();
      if (!trimmed) {
        continue;
      }
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
}

@Injectable()
export class RecipientStrategyRegistry {
  constructor(
    private readonly direct: DirectRecipientStrategy,
    private readonly postAuthor: PostAuthorRecipientStrategy,
    private readonly selfActor: SelfActorRecipientStrategy,
    private readonly objectAudience: ObjectAudienceRecipientStrategy,
    private readonly userBell: UserBellRecipientStrategy,
    private readonly threadAuthorFollower: ThreadAuthorFollowerRecipientStrategy,
    private readonly channelMessaging: ChannelMessagingRecipientStrategy,
    private readonly obl: OblRecipientStrategy,
  ) {}

  private strategies(): RecipientStrategy[] {
    return [
      this.direct,
      this.postAuthor,
      this.selfActor,
      this.objectAudience,
      this.userBell,
      this.threadAuthorFollower,
      this.channelMessaging,
      this.obl,
    ];
  }

  async resolveRecipients(event: AnyNotificationEvent): Promise<string[]> {
    for (const strategy of this.strategies()) {
      if (strategy.supports(event.type)) {
        return strategy.resolveRecipients(event);
      }
    }
    return [];
  }
}
