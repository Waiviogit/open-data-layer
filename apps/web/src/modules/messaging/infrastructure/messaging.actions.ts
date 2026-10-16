'use server';

import { updateTag } from 'next/cache';

import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

import { getChannelByIdQuery } from '../application/queries/get-channel-by-id.query';
import { getChannelMessagesQuery } from '../application/queries/get-channel-messages.query';
import { getObjectChannelMessagesQuery } from '../application/queries/get-object-channel-messages.query';
import { getViewerChannelsQuery } from '../application/queries/get-viewer-channels.query';
import type { ChannelDetail } from '../domain/messaging.types';
import { EMPTY_LEAVE_POLICY } from '../domain/messaging.types';
import { markChannelRead } from './messaging.client';
import type { ChannelListPage, MessageHistoryPage } from '../domain/messaging.types';

async function requireViewer(): Promise<string> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const username = user?.username?.trim();
  if (!username) {
    throw new Error('Login required');
  }
  return username;
}

export async function loadMoreViewerChannelsAction(
  cursor: string,
): Promise<ChannelListPage> {
  const viewer = await requireViewer();
  return getViewerChannelsQuery(viewer, { cursor, limit: 20 });
}

export async function loadOlderChannelMessagesAction(
  channelId: string,
  cursor: string,
): Promise<MessageHistoryPage> {
  const viewer = await requireViewer();
  return getChannelMessagesQuery(channelId, viewer, { cursor, limit: 50 });
}

export async function loadOlderObjectChannelMessagesAction(
  objectId: string,
  cursor: string,
): Promise<MessageHistoryPage> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  return getObjectChannelMessagesQuery(
    objectId,
    { cursor, limit: 50 },
    user?.username ?? null,
  );
}

export async function markChannelReadAction(
  channelId: string,
  lastReadAtUnix: number,
): Promise<boolean> {
  const viewer = await requireViewer();
  const result = await markChannelRead(channelId, viewer, lastReadAtUnix);
  if (!result) {
    return false;
  }
  updateTag(queryApiCacheTags.viewerChannels(viewer));
  updateTag(queryApiCacheTags.userFeedUnreadCounts(viewer));
  return true;
}

function buildPeerChannelDetail(viewer: string, peer: string): ChannelDetail {
  return {
    channel_id: '',
    kind: 'direct',
    creator: viewer,
    title: null,
    image: null,
    object_id: null,
    access: 'members_only',
    display_title: peer,
    list_title: null,
    peer,
    members: [
      { account: viewer, role: 'member' },
      { account: peer, role: 'member' },
    ],
    viewer_role: null,
    leave_policy: EMPTY_LEAVE_POLICY,
  };
}

export async function loadProfileChannelAboutAction(input: {
  channel?: string | null;
  peer?: string | null;
}): Promise<ChannelDetail | null> {
  const viewer = await requireViewer();
  const peer = input.peer?.trim() || null;
  const channelId = input.channel?.trim() || null;

  if (peer) {
    return buildPeerChannelDetail(viewer, peer);
  }

  if (channelId) {
    return getChannelByIdQuery(channelId, viewer);
  }

  return null;
}
