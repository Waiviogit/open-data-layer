import { redirect } from 'next/navigation';

import {
  getChannelMessagesQuery,
  getChannelByIdQuery,
  getViewerChannelsQuery,
  MessagingInboxClient,
} from '@/modules/messaging';
import { readEncryptLockEnabledCookie } from '@/modules/messaging/domain/encrypt-lock-cookie.server';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export default async function UserProfileMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ channel?: string; peer?: string }>;
}) {
  const { name } = await params;
  const { channel: channelParam, peer: peerParam } = await searchParams;
  const accountName = decodeURIComponent(name);
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewer = user?.username?.trim() ?? null;

  if (!viewer) {
    redirect(`/sign-in?next=${encodeURIComponent(`/@${accountName}/messages`)}`);
  }

  if (viewer.toLowerCase() !== accountName.toLowerCase()) {
    redirect(`/@${viewer}/messages`);
  }

  const initialChannels = await getViewerChannelsQuery(viewer, { limit: 20 });
  const initialPeer = peerParam?.trim() || null;
  const channelFromUrl = channelParam?.trim() || null;

  if (!channelFromUrl && !initialPeer) {
    for (const item of initialChannels.items) {
      const channelId = item.channel_id?.trim();
      if (!channelId) {
        continue;
      }
      const detail = await getChannelByIdQuery(channelId, viewer);
      if (detail) {
        redirect(
          `/@${accountName}/messages?${new URLSearchParams({
            channel: channelId,
          }).toString()}`,
        );
      }
    }
  }

  const initialChannelId = channelFromUrl;

  if (initialChannelId && !initialPeer) {
    const requestedDetail = await getChannelByIdQuery(initialChannelId, viewer);
    if (!requestedDetail) {
      for (const item of initialChannels.items) {
        const channelId = item.channel_id?.trim();
        if (!channelId || channelId === initialChannelId) {
          continue;
        }
        const detail = await getChannelByIdQuery(channelId, viewer);
        if (detail) {
          redirect(
            `/@${accountName}/messages?${new URLSearchParams({
              channel: channelId,
            }).toString()}`,
          );
        }
      }
      redirect(`/@${accountName}/messages`);
    }
  }

  const initialMessages =
    initialChannelId && !initialPeer
    ? await getChannelMessagesQuery(initialChannelId, viewer, { limit: 50 })
    : { items: [], cursor: null, hasMore: false };

  const initialChannelDetail =
    initialChannelId && !initialPeer
    ? await getChannelByIdQuery(initialChannelId, viewer)
    : null;

  return (
    <MessagingInboxClient
      viewerUsername={viewer}
      accountName={accountName}
      initialChannels={initialChannels}
      initialChannelId={initialChannelId}
      initialPeer={initialPeer}
      initialMessages={initialMessages}
      initialChannelDetail={initialChannelDetail}
      initialEncryptEnabled={await readEncryptLockEnabledCookie(viewer)}
      listInLeftRail
    />
  );
}
