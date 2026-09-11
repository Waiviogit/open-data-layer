import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { UserNotificationSettings } from '@opden-data-layer/odl-db-types';

import type { Database } from '../database';
import { KYSELY } from '../database';

export type UserNotificationSettingsUpsertPayload = Omit<
  UserNotificationSettings,
  'account' | 'deactivation_campaign'
>;

@Injectable()
export class UserNotificationSettingsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async upsert(
    account: string,
    data: UserNotificationSettingsUpsertPayload,
  ): Promise<void> {
    const a = account.trim();
    if (a.length === 0) {
      return;
    }

    await this.db
      .insertInto('user_notification_settings')
      .values({
        account: a,
        deactivation_campaign: true,
        ...data,
      })
      .onConflict((oc) =>
        oc.column('account').doUpdateSet({
          follow: data.follow,
          reblog: data.reblog,
          reply: data.reply,
          mention: data.mention,
          vote: data.vote,
          downvote: data.downvote,
          claimed_object_updates: data.claimed_object_updates,
          group_id_control: data.group_id_control,
          followed_user_threads: data.followed_user_threads,
          transfer: data.transfer,
          fill_order: data.fill_order,
          power_up: data.power_up,
          claim_reward: data.claim_reward,
          witness_vote: data.witness_vote,
          my_post: data.my_post,
          my_comment: data.my_comment,
          my_like: data.my_like,
          minimal_transfer: data.minimal_transfer,
          messages: data.messages,
          obl: data.obl,
        }),
      )
      .execute();
  }
}
