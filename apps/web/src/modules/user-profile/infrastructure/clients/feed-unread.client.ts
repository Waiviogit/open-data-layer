import 'server-only';

import { z } from 'zod';

import {
  queryApiFetch,
  queryApiFetchLive,
  queryApiFetchOutcome,
  QUERY_API_LIVE_INIT,
} from './query-api.client';
import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

const feedUnreadCountsSchema = z.object({
  posts: z.number().int().nonnegative(),
  threads: z.number().int().nonnegative(),
  messages: z.number().int().nonnegative(),
});

export type FeedUnreadCountsView = z.infer<typeof feedUnreadCountsSchema>;

function parseFeedUnreadCounts(raw: unknown): FeedUnreadCountsView | null {
  const parsed = feedUnreadCountsSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      '[fetchUserFeedUnreadCounts] unexpected response shape:',
      parsed.error.flatten(),
    );
    return null;
  }
  return parsed.data;
}

export async function fetchUserFeedUnreadCounts(
  accountName: string,
  viewer: string,
): Promise<FeedUnreadCountsView | null> {
  const path = `/query/v1/users/${encodeURIComponent(accountName)}/feed-unread-counts`;
  const raw = await queryApiFetch<unknown>(path, {
    headers: { 'X-Viewer': viewer },
    cacheTags: [queryApiCacheTags.userFeedUnreadCounts(accountName)],
  });
  if (raw === null) {
    return null;
  }
  return parseFeedUnreadCounts(raw);
}

export async function fetchUserFeedUnreadCountsLive(
  accountName: string,
  viewer: string,
): Promise<FeedUnreadCountsView | null> {
  const path = `/query/v1/users/${encodeURIComponent(accountName)}/feed-unread-counts`;
  const raw = await queryApiFetchLive<unknown>(path, {
    headers: { 'X-Viewer': viewer },
  });
  if (raw === null) {
    return null;
  }
  return parseFeedUnreadCounts(raw);
}

export async function markUserProfileFeedRead(
  accountName: string,
  viewer: string,
  tab: 'posts' | 'threads' | 'messages',
  readAtUnix: number,
): Promise<boolean> {
  const path = `/query/v1/users/${encodeURIComponent(accountName)}/feed-read`;
  const outcome = await queryApiFetchOutcome<{ updated: boolean }>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Viewer': viewer,
    },
    body: JSON.stringify({ tab, read_at_unix: readAtUnix }),
    ...QUERY_API_LIVE_INIT,
  });
  return outcome.ok;
}
