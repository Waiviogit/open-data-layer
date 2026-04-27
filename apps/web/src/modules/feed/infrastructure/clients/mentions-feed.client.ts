import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

export interface UserMentionsFeedResponse {
  items: unknown[];
  cursor: string | null;
  hasMore: boolean;
}

export async function fetchUserMentionsFeed(
  accountName: string,
  body: { limit?: number; cursor?: string },
  init?: { viewer?: string | null },
): Promise<UserMentionsFeedResponse | null> {
  const path = `/query/v1/users/${encodeURIComponent(accountName)}/mentions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init?.viewer != null && init.viewer.trim() !== '') {
    headers['X-Viewer'] = init.viewer.trim();
  }
  return queryApiFetch<UserMentionsFeedResponse>(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });
}
