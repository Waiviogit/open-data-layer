import { Injectable } from '@nestjs/common';
import { ObjectsCoreRepository, MessagingRepository } from '../../repositories';
import { GovernanceResolverService } from '../governance';
import { UserAccountMutesRepository } from '../../repositories';
import type { ChannelDetailDto } from './get-channel-by-id.endpoint';
import { GetChannelByIdEndpoint } from './get-channel-by-id.endpoint';
import type { MessageHistoryBody } from './schemas/messaging.schema';
import {
  decodeMessageCursor,
  encodeMessageCursor,
} from './message-feed-cursor';
import { mapMessageToDto, type MessageDto } from './message-projection';

export type { MessageDto, MessageEncryptionDto, MessageSourceObjectDto } from './message-projection';

export type MessageHistoryResponseDto = {
  items: MessageDto[];
  cursor: string | null;
  hasMore: boolean;
};

@Injectable()
export class GetObjectChannelEndpoint {
  constructor(
    private readonly objectsCoreRepo: ObjectsCoreRepository,
    private readonly messagingRepo: MessagingRepository,
    private readonly getChannelById: GetChannelByIdEndpoint,
  ) {}

  async execute(objectId: string, viewer?: string): Promise<ChannelDetailDto | null> {
    const trimmedId = objectId.trim();
    if (!trimmedId) {
      return null;
    }

    const core = await this.objectsCoreRepo.findByObjectIdForPage(trimmedId);
    if (!core) {
      return null;
    }

    const channel = await this.messagingRepo.findObjectChannel(trimmedId);
    if (!channel) {
      return null;
    }

    return this.getChannelById.execute(channel.channel_id, viewer);
  }
}

@Injectable()
export class GetObjectChannelMessagesEndpoint {
  constructor(
    private readonly objectsCoreRepo: ObjectsCoreRepository,
    private readonly messagingRepo: MessagingRepository,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly userAccountMutesRepo: UserAccountMutesRepository,
  ) {}

  async execute(
    objectId: string,
    body: MessageHistoryBody,
    governanceObjectIdFromHeader?: string,
    viewerAccount?: string,
  ): Promise<MessageHistoryResponseDto | null> {
    const trimmedId = objectId.trim();
    if (!trimmedId) {
      return null;
    }

    const core = await this.objectsCoreRepo.findByObjectIdForPage(trimmedId);
    if (!core) {
      return null;
    }

    const governance = await this.governanceResolver.resolveMergedForObjectView(
      governanceObjectIdFromHeader,
    );

    const viewerTrimmed = viewerAccount?.trim() ?? '';
    const viewerMutes =
      viewerTrimmed.length > 0
        ? await this.userAccountMutesRepo.listMutedForMuters([viewerTrimmed])
        : [];

    const excludedAuthors = dedupeStrings([...governance.muted, ...viewerMutes]);

    const includeDuplicates = body.for_context
      ? false
      : (body.include_duplicates ?? false);

    return this.fetchObjectActivityMessages(
      trimmedId,
      { ...body, include_duplicates: includeDuplicates },
      excludedAuthors,
      body.for_context ? viewerTrimmed : undefined,
    );
  }

  async fetchObjectActivityMessages(
    objectId: string,
    body: MessageHistoryBody,
    excludedAuthors: readonly string[],
    forContextViewer?: string,
  ): Promise<MessageHistoryResponseDto> {
    const limit = body.limit;
    const limitPlusOne = limit + 1;
    const cursorPayload = body.cursor ? decodeMessageCursor(body.cursor) : null;
    if (body.cursor && !cursorPayload) {
      return { items: [], cursor: null, hasMore: false };
    }

    const rows = await this.messagingRepo.listObjectActivityMessages(
      objectId,
      excludedAuthors,
      cursorPayload,
      limitPlusOne,
      forContextViewer,
      body.include_duplicates ?? false,
    );

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const sourceObjectIds = [
      ...new Set(
        page
          .map((row) => row.channel_object_id?.trim())
          .filter((id): id is string => Boolean(id && id !== objectId)),
      ),
    ];
    const sourceNameByObjectId =
      await this.messagingRepo.findObjectChannelTitles(sourceObjectIds);

    const items = page.map((row) =>
      mapMessageToDto(row, {
        requestedObjectId: objectId,
        channelObjectId: row.channel_object_id,
        sourceNameByObjectId,
        duplicateCount: row.duplicate_count,
      }),
    );

    const last = page[page.length - 1];
    const effectiveUnix = last
      ? Number(last.original_created_at_unix ?? last.created_at_unix)
      : null;

    const nextCursor =
      hasMore && last && effectiveUnix != null && Number.isFinite(effectiveUnix)
        ? encodeMessageCursor({
            createdAtUnix: effectiveUnix,
            eventSeq: BigInt(last.event_seq),
          })
        : null;

    const safeHasMore = hasMore && nextCursor != null;

    return { items, cursor: nextCursor, hasMore: safeHasMore };
  }
}

function dedupeStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((v) => v.trim().length > 0))];
}
