'use server';

import { updateTag } from 'next/cache';

import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

import {
  fetchUserFeedUnreadCountsLive,
  markUserProfileFeedRead,
} from './clients/feed-unread.client';

export async function markProfileFeedReadAction(
  accountName: string,
  tab: 'posts' | 'threads' | 'messages',
): Promise<void> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewer = user?.username?.trim() ?? '';
  const account = accountName.trim();
  if (!viewer || viewer.toLowerCase() !== account.toLowerCase()) {
    return;
  }
  const readAtUnix = Math.floor(Date.now() / 1000);
  await markUserProfileFeedRead(account, viewer, tab, readAtUnix);
  updateTag(queryApiCacheTags.userFeedUnreadCounts(account));
}

export async function refreshMessagesUnreadCountAction(): Promise<number | null> {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  const viewer = user?.username?.trim() ?? '';
  if (!viewer) {
    return null;
  }
  updateTag(queryApiCacheTags.userFeedUnreadCounts(viewer));
  updateTag(queryApiCacheTags.viewerChannels(viewer));
  const counts = await fetchUserFeedUnreadCountsLive(viewer, viewer);
  return counts?.messages ?? null;
}
