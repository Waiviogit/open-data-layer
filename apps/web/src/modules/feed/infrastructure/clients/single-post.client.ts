import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

export async function fetchSinglePost(
  author: string,
  permlink: string,
  init?: { locale?: string; viewer?: string | null },
): Promise<unknown | null> {
  const search = new URLSearchParams();
  if (init?.viewer != null && init.viewer.trim() !== '') {
    search.set('viewer', init.viewer.trim());
  }
  const qs = search.toString();
  const path = `/query/v1/posts/${encodeURIComponent(author)}/${encodeURIComponent(permlink)}${qs ? `?${qs}` : ''}`;
  const headers: Record<string, string> = {};
  if (init?.locale) {
    headers['X-Locale'] = init.locale;
    headers['Accept-Language'] = init.locale;
  }
  return queryApiFetch(path, { headers });
}
