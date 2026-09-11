import { Injectable } from '@nestjs/common';
import type { UserNotificationSettings } from '@opden-data-layer/odl-db-types';
import type {
  AnyNotificationEvent,
  NotificationEventType,
} from '@opden-data-layer/notifications-contract';

import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { NotificationSettingsView } from '../../constants/notification-settings.constants';

type SettingsColumn = keyof Pick<
  UserNotificationSettings,
  | 'follow'
  | 'reply'
  | 'mention'
  | 'reblog'
  | 'vote'
  | 'downvote'
  | 'my_post'
  | 'my_comment'
  | 'my_like'
  | 'transfer'
  | 'power_up'
  | 'claim_reward'
  | 'witness_vote'
  | 'fill_order'
  | 'claimed_object_updates'
  | 'group_id_control'
  | 'followed_user_threads'
  | 'messages'
  | 'obl'
>;

const TYPE_TO_SETTING: Partial<Record<NotificationEventType, SettingsColumn>> = {
  follow: 'follow',
  reply: 'reply',
  mention: 'mention',
  reblog: 'reblog',
  vote_like: 'vote',
  my_post: 'my_post',
  my_comment: 'my_comment',
  my_vote: 'my_like',
  transfer_in: 'transfer',
  transfer_out: 'transfer',
  transfer_from_savings: 'transfer',
  engine_transfer: 'transfer',
  engine_transfer_out: 'transfer',
  engine_swap: 'fill_order',
  power_up: 'power_up',
  power_down: 'transfer',
  claim_reward: 'claim_reward',
  witness_vote: 'witness_vote',
  fill_order: 'fill_order',
  bell_thread: 'followed_user_threads',
  thread_author_follower: 'followed_user_threads',
  object_update: 'claimed_object_updates',
  object_update_reject: 'claimed_object_updates',
  update_vote_cast: 'claimed_object_updates',
  message_direct: 'messages',
  message_group: 'messages',
  obl_offer_publish: 'obl',
  obl_offer_update: 'obl',
  obl_offer_retire: 'obl',
  obl_contract_sign: 'obl',
  obl_service_order_create: 'obl',
  obl_report_create: 'obl',
  obl_invoice_issue: 'obl',
  obl_payment_declare: 'obl',
  obl_payment_confirm: 'obl',
  obl_dispute_open: 'obl',
  obl_dispute_resolve: 'obl',
};

const MINIMAL_TRANSFER_TYPES = new Set<NotificationEventType>([
  'transfer_in',
  'engine_transfer',
]);

const GROUP_ID_UPDATE_TYPES = new Set<NotificationEventType>([
  'object_update',
  'object_update_reject',
]);

/** USD price per unit, keyed by Hive symbol. */
export interface UsdRates {
  hive: number;
  hbd: number;
}

/**
 * Pure gating rules. Callers resolve settings up front (see NotificationAudienceService)
 * so a batch of events can be filtered without any I/O.
 */
@Injectable()
export class NotificationSettingsService {
  isAllowed(
    settings: NotificationSettingsView,
    event: AnyNotificationEvent,
    usdRates: UsdRates | null,
  ): boolean {
    if (event.type === 'vote_downvote' && settings.downvote === false) {
      return false;
    }

    const column = TYPE_TO_SETTING[event.type];
    if (column && settings[column] === false) {
      return false;
    }

    if (GROUP_ID_UPDATE_TYPES.has(event.type)) {
      if (
        settings.group_id_control === false &&
        (event.type === 'object_update' ||
          event.type === 'object_update_reject') &&
        event.payload.updateType === UPDATE_TYPES.PRODUCT_GROUP_ID
      ) {
        return false;
      }
    }

    if (MINIMAL_TRANSFER_TYPES.has(event.type)) {
      if (event.type === 'transfer_in' || event.type === 'engine_transfer') {
        return this.passesMinimalTransfer(
          event.payload.amount,
          event.payload.symbol,
          settings.minimal_transfer,
          usdRates,
        );
      }
    }

    return true;
  }

  /** True when the batch contains an event whose gating depends on USD rates. */
  needsUsdRates(events: AnyNotificationEvent[]): boolean {
    return events.some((event) => MINIMAL_TRANSFER_TYPES.has(event.type));
  }

  private passesMinimalTransfer(
    amount: string,
    symbol: string,
    minimalUsd: number,
    usdRates: UsdRates | null,
  ): boolean {
    if (minimalUsd <= 0) {
      return true;
    }
    const numeric = parseFloat(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return true;
    }
    if (!usdRates) {
      return true;
    }

    const upper = symbol.toUpperCase();
    if (upper === 'HIVE' && usdRates.hive > 0) {
      return numeric * usdRates.hive >= minimalUsd;
    }
    if (upper === 'HBD' && usdRates.hbd > 0) {
      return numeric * usdRates.hbd >= minimalUsd;
    }
    return true;
  }
}
