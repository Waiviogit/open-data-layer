import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

import { DEFAULT_FEED_CURRENCY } from '../../domain/feed-currency';

export async function fetchSinglePost(
  author: string,
  permlink: string,
  init?: { locale?: string; viewer?: string | null },
): Promise<unknown | null> {
  const path = `/query/v1/posts/${encodeURIComponent(author)}/${encodeURIComponent(permlink)}?currency=${encodeURIComponent(DEFAULT_FEED_CURRENCY)}`;
  const headers: Record<string, string> = {};
  if (init?.locale) {
    headers['X-Locale'] = init.locale;
    headers['Accept-Language'] = init.locale;
  }
  if (init?.viewer != null && init.viewer.trim() !== '') {
    headers['X-Viewer'] = init.viewer.trim();
  }
  return queryApiFetch(path, { headers, forwardClientIp: true });
}
