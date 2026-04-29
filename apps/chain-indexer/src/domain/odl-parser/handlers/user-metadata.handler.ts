import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { JsonValue } from '@opden-data-layer/core';
import {
  UserMetadataRepository,
  type UserMetadataUpsertPayload,
} from '../../../repositories/user-metadata.repository';
import type { OdlActionHandler, OdlEventContext } from '../odl-action-handler';
import { updateUserMetadataPayloadSchema } from '../odl-envelope.schema';
import {
  UserMetadataChangedEvent,
  USER_METADATA_CHANGED_EVENT,
} from '../user-metadata-changed.event';

@Injectable()
export class UserMetadataHandler implements OdlActionHandler {
  readonly action = 'update_user_metadata';
  private readonly logger = new Logger(UserMetadataHandler.name);

  constructor(
    private readonly userMetadataRepository: UserMetadataRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(payload: Record<string, unknown>, ctx: OdlEventContext): Promise<void> {
    const result = updateUserMetadataPayloadSchema.safeParse(payload);
    if (!result.success) {
      this.logger.warn(
        `Invalid update_user_metadata payload for action '${ctx.action}': ${result.error.message}`,
      );
      return;
    }

    try {
      const d = result.data;
      const row: UserMetadataUpsertPayload = {
        notifications_last_timestamp: d.notifications_last_timestamp,
        exit_page_setting: d.exit_page_setting,
        locale: d.locale,
        post_locales: d.post_locales as JsonValue,
        nightmode: d.nightmode,
        reward_setting: d.reward_setting,
        rewrite_links: d.rewrite_links,
        show_nsfw_posts: d.show_nsfw_posts,
        upvote_setting: d.upvote_setting,
        vote_percent: d.vote_percent,
        voting_power: d.voting_power,
        currency: d.currency === undefined ? null : d.currency,
        hide_linked_objects: d.hide_linked_objects,
        hide_recipe_objects: d.hide_recipe_objects,
      };
      await this.userMetadataRepository.upsertFull(ctx.creator, row);
      this.eventEmitter.emit(USER_METADATA_CHANGED_EVENT, new UserMetadataChangedEvent(ctx.creator));
    } catch (error) {
      this.logger.error(
        `update_user_metadata failed for '${ctx.creator}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
