import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

export interface UserThreadsFeedResponse {
  items: unknown[];
  cursor: string | null;
  hasMore: boolean;
}

export async function fetchUserThreadsFeed(
  accountName: string,
  body: { limit?: number; cursor?: string; sort?: 'latest' | 'oldest' },
  init?: { viewer?: string | null },
): Promise<UserThreadsFeedResponse | null> {
  const path = `/query/v1/users/${encodeURIComponent(accountName)}/threads`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init?.viewer != null && init.viewer.trim() !== '') {
    headers['X-Viewer'] = init.viewer.trim();
  }
  return queryApiFetch<UserThreadsFeedResponse>(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });
}
