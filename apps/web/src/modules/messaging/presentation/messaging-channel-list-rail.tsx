'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useLoginModal } from '@/modules/auth';

import { useCreateGroupChannel } from '../application/use-create-group-channel';
import {
  buildGroupChannelHref,
  resolveStartChatAction,
} from '../application/messaging-start-chat';
import {
  buildOptimisticGroupChannelListItem,
  mergeChannelListItems,
} from '../domain/messaging.helpers';
import type { ChannelListItem } from '../domain/messaging.types';
import { rememberDraftPeerAvatar } from '../infrastructure/draft-peer-avatar';
import {
  mergeViewerChannels,
  patchChannelListItem,
  subscribeMessagingChannelUpdated,
  subscribeMessagingChannelLeft,
} from '../infrastructure/messaging-channel-sync';
import { useViewerFollowingSet } from '../application/use-viewer-following-set';
import { MESSAGING_CARD_SHELL_CLASS } from './messaging-layout.constants';
import { MessagingChannelList } from './messaging-channel-list';
import { MessagingViewportShell } from './messaging-viewport-shell';
import { NewMessageModal } from './new-message-modal';

export type MessagingChannelListRailProps = {
  accountName: string;
  viewerUsername: string;
  channels: ChannelListItem[];
  activeChannelId: string | null;
};

export function MessagingChannelListRail({
  accountName,
  viewerUsername,
  channels: channelsProp,
  activeChannelId,
}: MessagingChannelListRailProps) {
  const router = useRouter();
  const { openLogin } = useLoginModal();
  const followingSet = useViewerFollowingSet(viewerUsername);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [channels, setChannels] = useState(channelsProp);
  const basePath = `/@${accountName}/messages`;

  useEffect(() => {
    setChannels((prev) => mergeViewerChannels(channelsProp, prev));
  }, [channelsProp]);

  useEffect(() => {
    return subscribeMessagingChannelUpdated((patch) => {
      setChannels((prev) => prev.map((item) => patchChannelListItem(item, patch)));
    });
  }, []);

  useEffect(() => {
    return subscribeMessagingChannelLeft(({ channelId }) => {
      setChannels((prev) => prev.filter((item) => item.channel_id !== channelId));
    });
  }, []);

  const prependGroupChannel = useCallback((item: ChannelListItem) => {
    setChannels((prev) => mergeChannelListItems([item], prev));
  }, []);

  const { createGroupChannel, pending: groupCreatePending } = useCreateGroupChannel({
    viewerUsername,
    onRequireLogin: openLogin,
    revalidateAccountName: viewerUsername,
  });

  const onSelectChannel = useCallback(
    (channelId: string) => {
      const params = new URLSearchParams();
      params.set('channel', channelId);
      router.push(`${basePath}?${params.toString()}`);
    },
    [basePath, router],
  );

  const handleStartChat = useCallback(
    async (input: { peers: string[]; title?: string; peerAvatarUrl?: string | null }) => {
      const action = await resolveStartChatAction(accountName, viewerUsername, input);
      if (action.kind === 'noop') {
        return;
      }
      if (action.kind === 'dm') {
        rememberDraftPeerAvatar(action.peer, input.peerAvatarUrl ?? null);
        router.push(action.href);
        setNewMessageOpen(false);
        return;
      }
      const channelId = await createGroupChannel({
        members: action.members,
        title: action.title,
      });
      if (!channelId) {
        return;
      }
      prependGroupChannel(
        buildOptimisticGroupChannelListItem({
          channelId,
          members: action.members,
          viewerUsername,
          title: action.title,
        }),
      );
      router.push(buildGroupChannelHref(accountName, channelId));
      router.refresh();
      setNewMessageOpen(false);
    },
    [accountName, createGroupChannel, prependGroupChannel, router, viewerUsername],
  );

  return (
    <>
      <MessagingViewportShell variant="sideRail">
        <div className={MESSAGING_CARD_SHELL_CLASS}>
          <MessagingChannelList
            variant="rail"
            channels={channels}
            activeChannelId={activeChannelId}
            onSelectChannel={onSelectChannel}
            onNewMessage={() => setNewMessageOpen(true)}
            followingSet={followingSet}
            viewerUsername={viewerUsername}
          />
        </div>
      </MessagingViewportShell>
      <NewMessageModal
        open={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        viewerUsername={viewerUsername}
        pending={groupCreatePending}
        onStartChat={handleStartChat}
      />
    </>
  );
}
