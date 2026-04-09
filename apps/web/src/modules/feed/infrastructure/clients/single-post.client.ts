import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

export async function fetchSinglePost(
  author: string,
  permlink: string,
  init?: { locale?: string },
): Promise<unknown | null> {
  const path = `/query/v1/posts/${encodeURIComponent(author)}/${encodeURIComponent(permlink)}`;
  const headers: Record<string, string> = {};
  if (init?.locale) {
    headers['X-Locale'] = init.locale;
    headers['Accept-Language'] = init.locale;
  }
  return queryApiFetch(path, { headers });
}
