import {
  mergeChannelListItems,
  sortChannelListItems,
} from '../domain/messaging.helpers';
import type { ChannelDetail, ChannelListItem } from '../domain/messaging.types';

export const MESSAGING_CHANNEL_UPDATED_EVENT = 'messaging:channel-updated';
export const MESSAGING_CHANNEL_LEFT_EVENT = 'messaging:channel-left';
export const MESSAGING_CHANNEL_MEMBERS_ADDED_EVENT = 'messaging:channel-members-added';
export const MESSAGING_CHANNEL_READ_EVENT = 'messaging:channel-read';

export type MessagingChannelUpdatedDetail = {
  channelId: string;
  title?: string;
  imageCid?: string;
};

export type MessagingChannelLeftDetail = {
  channelId: string;
};

export type MessagingChannelMembersAddedDetail = {
  channelId: string;
  accounts: string[];
};

export type MessagingChannelReadDetail = {
  channelId: string;
};

const leftChannelTombstones = new Set<string>();

export function tombstoneLeftChannel(channelId: string): void {
  const trimmed = channelId.trim();
  if (trimmed.length > 0) {
    leftChannelTombstones.add(trimmed);
  }
}

function clearStaleTombstones(serverItems: readonly ChannelListItem[]): void {
  for (const channelId of [...leftChannelTombstones]) {
    if (!serverItems.some((item) => item.channel_id === channelId)) {
      leftChannelTombstones.delete(channelId);
    }
  }
}

export function mergeViewerChannels(
  serverItems: readonly ChannelListItem[],
  localItems: readonly ChannelListItem[],
): ChannelListItem[] {
  clearStaleTombstones(serverItems);
  const filteredServer = serverItems.filter(
    (item) => !leftChannelTombstones.has(item.channel_id),
  );
  const filteredLocal = localItems.filter(
    (item) => !leftChannelTombstones.has(item.channel_id),
  );
  return mergeChannelListItems(filteredServer, filteredLocal);
}

export function pickNextChannelAfterLeave(
  channels: readonly ChannelListItem[],
  leftChannelId: string,
): string | null {
  const remaining = sortChannelListItems(
    channels.filter((item) => item.channel_id !== leftChannelId),
  );
  return remaining[0]?.channel_id ?? null;
}

export function buildMessagesHref(
  accountName: string,
  channelId?: string | null,
): string {
  const base = `/@${accountName}/messages`;
  const trimmed = channelId?.trim();
  if (!trimmed) {
    return base;
  }
  return `${base}?${new URLSearchParams({ channel: trimmed }).toString()}`;
}

export function clearChannelListUnread(
  item: ChannelListItem,
  channelId: string,
): ChannelListItem {
  if (item.channel_id !== channelId || item.unread_count === 0) {
    return item;
  }
  return { ...item, unread_count: 0 };
}

export function patchChannelListItem(
  item: ChannelListItem,
  patch: MessagingChannelUpdatedDetail,
): ChannelListItem {
  if (item.channel_id !== patch.channelId) {
    return item;
  }
  const nextTitle = patch.title?.trim() || item.display_title;
  return {
    ...item,
    display_title: nextTitle ?? item.display_title,
    list_title: nextTitle ?? item.list_title,
    image: patch.imageCid ? { cid: patch.imageCid } : item.image,
  };
}

export function patchChannelDetail(
  detail: ChannelDetail,
  patch: MessagingChannelUpdatedDetail,
): ChannelDetail {
  if (detail.channel_id !== patch.channelId) {
    return detail;
  }
  const nextTitle = patch.title?.trim() || detail.title;
  return {
    ...detail,
    title: nextTitle,
    display_title: nextTitle ?? detail.display_title,
    list_title: nextTitle ?? detail.list_title,
    image: patch.imageCid ? { cid: patch.imageCid } : detail.image,
  };
}

export function patchChannelDetailMembers(
  detail: ChannelDetail,
  patch: MessagingChannelMembersAddedDetail,
): ChannelDetail {
  if (detail.channel_id !== patch.channelId) {
    return detail;
  }
  const existing = new Set(detail.members.map((member) => member.account.toLowerCase()));
  const nextMembers = [...detail.members];
  for (const account of patch.accounts) {
    if (!existing.has(account.toLowerCase())) {
      nextMembers.push({ account, role: 'member' });
    }
  }
  return { ...detail, members: nextMembers };
}

export function dispatchMessagingChannelUpdated(detail: MessagingChannelUpdatedDetail): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<MessagingChannelUpdatedDetail>(MESSAGING_CHANNEL_UPDATED_EVENT, {
      detail,
    }),
  );
}

export function subscribeMessagingChannelUpdated(
  listener: (detail: MessagingChannelUpdatedDetail) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const handler = (event: Event) => {
    const custom = event as CustomEvent<MessagingChannelUpdatedDetail>;
    if (custom.detail?.channelId) {
      listener(custom.detail);
    }
  };
  window.addEventListener(MESSAGING_CHANNEL_UPDATED_EVENT, handler);
  return () => window.removeEventListener(MESSAGING_CHANNEL_UPDATED_EVENT, handler);
}

export function dispatchMessagingChannelLeft(detail: MessagingChannelLeftDetail): void {
  tombstoneLeftChannel(detail.channelId);
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<MessagingChannelLeftDetail>(MESSAGING_CHANNEL_LEFT_EVENT, {
      detail,
    }),
  );
}

export function subscribeMessagingChannelLeft(
  listener: (detail: MessagingChannelLeftDetail) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const handler = (event: Event) => {
    const custom = event as CustomEvent<MessagingChannelLeftDetail>;
    if (custom.detail?.channelId) {
      listener(custom.detail);
    }
  };
  window.addEventListener(MESSAGING_CHANNEL_LEFT_EVENT, handler);
  return () => window.removeEventListener(MESSAGING_CHANNEL_LEFT_EVENT, handler);
}

export function dispatchMessagingChannelMembersAdded(
  detail: MessagingChannelMembersAddedDetail,
): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<MessagingChannelMembersAddedDetail>(
      MESSAGING_CHANNEL_MEMBERS_ADDED_EVENT,
      { detail },
    ),
  );
}

export function subscribeMessagingChannelMembersAdded(
  listener: (detail: MessagingChannelMembersAddedDetail) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const handler = (event: Event) => {
    const custom = event as CustomEvent<MessagingChannelMembersAddedDetail>;
    if (custom.detail?.channelId) {
      listener(custom.detail);
    }
  };
  window.addEventListener(MESSAGING_CHANNEL_MEMBERS_ADDED_EVENT, handler);
  return () =>
    window.removeEventListener(MESSAGING_CHANNEL_MEMBERS_ADDED_EVENT, handler);
}

export function dispatchMessagingChannelRead(detail: MessagingChannelReadDetail): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<MessagingChannelReadDetail>(MESSAGING_CHANNEL_READ_EVENT, {
      detail,
    }),
  );
}

export function subscribeMessagingChannelRead(
  listener: (detail: MessagingChannelReadDetail) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const handler = (event: Event) => {
    const custom = event as CustomEvent<MessagingChannelReadDetail>;
    if (custom.detail?.channelId) {
      listener(custom.detail);
    }
  };
  window.addEventListener(MESSAGING_CHANNEL_READ_EVENT, handler);
  return () => window.removeEventListener(MESSAGING_CHANNEL_READ_EVENT, handler);
}

/** @internal Test helper */
export function resetMessagingChannelTombstonesForTests(): void {
  leftChannelTombstones.clear();
}
