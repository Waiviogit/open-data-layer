import { Injectable, BadRequestException } from '@nestjs/common';
import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import { MessagingRepository } from '../../repositories/messaging.repository';
import {
  decodeChannelCursor,
  encodeChannelCursor,
} from './message-feed-cursor';
import type { ChannelListQuery } from './schemas/messaging.schema';
import {
  buildDmListTitle,
  buildDmPeer,
  memberAccounts,
} from './channel-projection';
import { loadAccountAvatarUrls } from './load-account-avatar-urls';

export type ChannelListItemDto = {
  channel_id: string;
  kind: string;
  display_title: string | null;
  list_title: string | null;
  peer: string | null;
  peer_avatar_url: string | null;
  members: string[];
  last_message_at_unix: number | null;
  unread_count: number;
  image: unknown;
  last_message_preview: string | null;
  last_message_encrypted: boolean;
};

export type ChannelListResponseDto = {
  items: ChannelListItemDto[];
  cursor: string | null;
  hasMore: boolean;
};

@Injectable()
export class GetChannelsEndpoint {
  constructor(
    private readonly messagingRepo: MessagingRepository,
    private readonly accountsRepo: AccountsCurrentRepository,
  ) {}

  async execute(
    viewer: string,
    query: ChannelListQuery,
  ): Promise<ChannelListResponseDto> {
    const viewerTrimmed = viewer.trim();
    if (!viewerTrimmed) {
      throw new BadRequestException('X-Viewer is required');
    }

    const limit = query.limit;
    const limitPlusOne = limit + 1;
    const cursorPayload = query.cursor ? decodeChannelCursor(query.cursor) : null;
    if (query.cursor && !cursorPayload) {
      return { items: [], cursor: null, hasMore: false };
    }

    const rows = await this.messagingRepo.listViewerChannels(
      viewerTrimmed,
      query.kind,
      cursorPayload,
      limitPlusOne,
    );

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const items: ChannelListItemDto[] = [];
    for (const channel of page) {
      const members = await this.messagingRepo.listMembers(channel.channel_id);
      const accounts = memberAccounts(members);
      let displayTitle: string | null = channel.title;
      let listTitle: string | null = channel.title;
      let peer: string | null = null;

      if (channel.kind === 'direct') {
        peer = buildDmPeer(accounts, viewerTrimmed);
        displayTitle = peer;
        listTitle = buildDmListTitle(accounts);
      } else if (channel.kind === 'group') {
        listTitle = channel.title ?? buildDmListTitle(accounts);
        displayTitle = listTitle;
      }

      const viewerMember = members.find((m) => m.account === viewerTrimmed);
      const lastReadAt = viewerMember?.last_read_at_unix ?? null;
      const unreadCount = await this.messagingRepo.countUnreadMessages(
        channel.channel_id,
        viewerTrimmed,
        lastReadAt,
      );
      const lastMessage = await this.messagingRepo.getLastMessagePreview(
        channel.channel_id,
      );

      items.push({
        channel_id: channel.channel_id,
        kind: channel.kind,
        display_title: displayTitle,
        list_title: listTitle,
        peer,
        peer_avatar_url: null,
        members: accounts,
        last_message_at_unix: channel.last_message_at_unix,
        unread_count: unreadCount,
        image: channel.image,
        last_message_preview: lastMessage.preview,
        last_message_encrypted: lastMessage.encrypted,
      });
    }

    const avatarUrls = await loadAccountAvatarUrls(
      this.accountsRepo,
      items.flatMap((item) => (item.peer ? [item.peer] : [])),
    );
    for (const item of items) {
      item.peer_avatar_url = item.peer ? (avatarUrls.get(item.peer) ?? null) : null;
    }

    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeChannelCursor({
            lastMessageAtUnix: last.last_message_at_unix ?? last.created_at_unix,
            channelId: last.channel_id,
          })
        : null;

    return { items, cursor: nextCursor, hasMore };
  }
}
