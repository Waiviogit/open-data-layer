import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Channel, ChannelMember } from '@opden-data-layer/odl-db-types';

import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import { MessagingRepository } from '../../repositories/messaging.repository';
import { loadAccountAvatarUrls } from './load-account-avatar-urls';
import {
  buildDmListTitle,
  buildDmPeer,
  buildLeavePolicy,
  mapMembersWithRoles,
  type ChannelLeavePolicy,
  type ChannelMemberView,
} from './channel-projection';

export type ChannelDetailDto = {
  channel_id: string;
  kind: string;
  creator: string;
  title: string | null;
  image: unknown;
  object_id: string | null;
  access: string;
  display_title: string | null;
  list_title: string | null;
  peer: string | null;
  members: ChannelMemberView[];
  viewer_role: 'admin' | 'member' | null;
  leave_policy: ChannelLeavePolicy;
};

@Injectable()
export class GetChannelByIdEndpoint {
  constructor(
    private readonly messagingRepo: MessagingRepository,
    private readonly accountsRepo: AccountsCurrentRepository,
  ) {}

  async execute(
    channelId: string,
    viewer?: string,
  ): Promise<ChannelDetailDto | null> {
    const channel = await this.messagingRepo.findChannelById(channelId.trim());
    if (!channel) {
      return null;
    }

    if (channel.dissolved_at_unix != null) {
      throw new NotFoundException('Channel not found');
    }

    const members =
      channel.kind === 'object'
        ? []
        : await this.messagingRepo.listMembers(channel.channel_id);

    if (channel.kind !== 'object') {
      const viewerTrimmed = viewer?.trim() ?? '';
      if (!viewerTrimmed) {
        throw new ForbiddenException('Membership required');
      }
      const isMember = await this.messagingRepo.isMember(channel.channel_id, viewerTrimmed);
      if (!isMember) {
        throw new ForbiddenException('Not a channel member');
      }
    }

    const avatarUrls = await loadAccountAvatarUrls(
      this.accountsRepo,
      members.map((member) => member.account),
    );
    return this.project(channel, members, viewer, avatarUrls);
  }

  private project(
    channel: Channel,
    members: ChannelMember[],
    viewer: string | undefined,
    avatarUrls: ReadonlyMap<string, string | null>,
  ): ChannelDetailDto {
    const memberViews = mapMembersWithRoles(members, avatarUrls);
    const accounts = memberViews.map((member) => member.account);
    let displayTitle: string | null = channel.title;
    let listTitle: string | null = channel.title;
    let peer: string | null = null;

    if (channel.kind === 'direct' && viewer) {
      peer = buildDmPeer(accounts, viewer);
      displayTitle = peer;
      listTitle = buildDmListTitle(accounts);
    } else if (channel.kind === 'group') {
      listTitle = channel.title ?? buildDmListTitle(accounts);
      displayTitle = listTitle;
    }

    const viewerTrimmed = viewer?.trim() ?? '';
    const viewerMember = memberViews.find((member) => member.account === viewerTrimmed);
    const leavePolicy =
      channel.kind === 'group' && viewerTrimmed
        ? buildLeavePolicy(members, viewerTrimmed)
        : {
            can_leave: false,
            requires_successor: false,
            eligible_successors: [],
          };

    return {
      channel_id: channel.channel_id,
      kind: channel.kind,
      creator: channel.creator,
      title: channel.title,
      image: channel.image,
      object_id: channel.object_id,
      access: channel.access,
      display_title: displayTitle,
      list_title: listTitle,
      peer,
      members: memberViews,
      viewer_role: viewerMember?.role ?? null,
      leave_policy: leavePolicy,
    };
  }
}
