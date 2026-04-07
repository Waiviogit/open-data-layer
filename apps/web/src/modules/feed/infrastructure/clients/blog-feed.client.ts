import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

export interface UserBlogFeedResponse {
  items: unknown[];
  cursor: string | null;
  hasMore: boolean;
}

export async function fetchUserBlogFeed(
  accountName: string,
  body: { limit?: number; cursor?: string },
): Promise<UserBlogFeedResponse | null> {
  const path = `/query/v1/users/${encodeURIComponent(accountName)}/blog`;
  return queryApiFetch<UserBlogFeedResponse>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}
