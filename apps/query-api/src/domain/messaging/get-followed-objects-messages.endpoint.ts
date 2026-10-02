import { Injectable } from '@nestjs/common';
import {
  AccountsCurrentRepository,
  MessagingRepository,
  UserAccountMutesRepository,
} from '../../repositories';
import { GovernanceResolverService } from '../governance';
import type { ObjectActivityMessageHistoryBody } from './schemas/messaging.schema';
import { resolveActivityAuthorsAllowlist } from '../governance/resolve-activity-authors-allowlist';
import {
  decodeMessageCursor,
  encodeMessageCursor,
} from './message-feed-cursor';
import { mapMessageToDto, type MessageDto } from './message-projection';

export type FollowedObjectRefDto = {
  object_id: string;
  name: string;
};

export type FollowedObjectsMessageDto = MessageDto & {
  object: FollowedObjectRefDto;
};

export type FollowedObjectsMessagesResponseDto = {
  items: FollowedObjectsMessageDto[];
  cursor: string | null;
  hasMore: boolean;
};

@Injectable()
export class GetFollowedObjectsMessagesEndpoint {
  constructor(
    private readonly accounts: AccountsCurrentRepository,
    private readonly messagingRepo: MessagingRepository,
    private readonly governanceResolver: GovernanceResolverService,
    private readonly userAccountMutesRepo: UserAccountMutesRepository,
  ) {}

  async execute(
    username: string,
    body: ObjectActivityMessageHistoryBody,
    governanceObjectIdFromHeader?: string,
    viewerAccount?: string,
  ): Promise<FollowedObjectsMessagesResponseDto | null> {
    const name = username.trim();
    if (name.length === 0) {
      return null;
    }

    const account = await this.accounts.findByName(name);
    if (!account) {
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
    const forContextViewer =
      body.for_context && viewerTrimmed.length > 0 ? viewerTrimmed : undefined;

    const includedAuthors = await resolveActivityAuthorsAllowlist(this.governanceResolver, {
      authorsOnly: body.authors_only,
      governanceObjectIdFromHeader,
      authorsGovernanceObjectId: body.authors_governance_object_id,
    });
    if (includedAuthors && includedAuthors.length === 0) {
      return { items: [], cursor: null, hasMore: false };
    }

    const limit = body.limit;
    const cursorPayload = body.cursor ? decodeMessageCursor(body.cursor) : null;
    if (body.cursor && !cursorPayload) {
      return { items: [], cursor: null, hasMore: false };
    }

    const rows = await this.messagingRepo.listFollowedObjectActivityMessages(
      name,
      excludedAuthors,
      cursorPayload,
      limit + 1,
      forContextViewer,
      includeDuplicates,
      includedAuthors,
    );

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const channelObjectIds = [
      ...new Set(
        page
          .map((row) => row.channel_object_id?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const nameByObjectId = await this.messagingRepo.findObjectChannelTitles(channelObjectIds);

    const items = page.map((row) => {
      const objectId = row.channel_object_id?.trim() ?? '';
      const nameFromTitle = nameByObjectId.get(objectId)?.trim();
      return {
        ...mapMessageToDto(row, { duplicateCount: row.duplicate_count }),
        object: {
          object_id: objectId,
          name: nameFromTitle && nameFromTitle.length > 0 ? nameFromTitle : objectId,
        },
      };
    });

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

    return {
      items,
      cursor: nextCursor,
      hasMore: hasMore && nextCursor != null,
    };
  }
}

function dedupeStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
