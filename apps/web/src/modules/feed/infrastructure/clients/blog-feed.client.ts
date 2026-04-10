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
  init?: { viewer?: string | null },
): Promise<UserBlogFeedResponse | null> {
  const path = `/query/v1/users/${encodeURIComponent(accountName)}/blog`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init?.viewer != null && init.viewer.trim() !== '') {
    headers['X-Viewer'] = init.viewer.trim();
  }
  return queryApiFetch<UserBlogFeedResponse>(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });
}
