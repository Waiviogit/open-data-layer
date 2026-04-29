import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { JsonValue, UserMetadata } from '@opden-data-layer/core';

/** Payload for full `update_user_metadata` ODL overwrite (aligned with {@link UserMetadata} excluding PK). */
export type UserMetadataUpsertPayload = Omit<UserMetadata, 'account'>;

@Injectable()
export class UserMetadataRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByAccount(account: string): Promise<UserMetadata | undefined> {
    const trimmed = account.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    return this.db
      .selectFrom('user_metadata')
      .selectAll()
      .where('account', '=', trimmed)
      .executeTakeFirst();
  }

  /**
   * Full replacement of `user_metadata` for `account` (`ON CONFLICT DO UPDATE SET` all columns).
   * Requires existing `accounts_current` row (FK).
   */
  async upsertFull(account: string, data: UserMetadataUpsertPayload): Promise<void> {
    const a = account.trim();
    if (a.length === 0) {
      return;
    }

    const postLocales = data.post_locales as JsonValue;

    await this.db
      .insertInto('user_metadata')
      .values({
        account: a,
        notifications_last_timestamp: data.notifications_last_timestamp,
        exit_page_setting: data.exit_page_setting,
        locale: data.locale,
        post_locales: postLocales,
        nightmode: data.nightmode,
        reward_setting: data.reward_setting,
        rewrite_links: data.rewrite_links,
        show_nsfw_posts: data.show_nsfw_posts,
        upvote_setting: data.upvote_setting,
        vote_percent: data.vote_percent,
        voting_power: data.voting_power,
        currency: data.currency,
        hide_linked_objects: data.hide_linked_objects,
        hide_recipe_objects: data.hide_recipe_objects,
      })
      .onConflict((oc) =>
        oc.column('account').doUpdateSet({
          notifications_last_timestamp: data.notifications_last_timestamp,
          exit_page_setting: data.exit_page_setting,
          locale: data.locale,
          post_locales: postLocales,
          nightmode: data.nightmode,
          reward_setting: data.reward_setting,
          rewrite_links: data.rewrite_links,
          show_nsfw_posts: data.show_nsfw_posts,
          upvote_setting: data.upvote_setting,
          vote_percent: data.vote_percent,
          voting_power: data.voting_power,
          currency: data.currency,
          hide_linked_objects: data.hide_linked_objects,
          hide_recipe_objects: data.hide_recipe_objects,
        }),
      )
      .execute();
  }
}
