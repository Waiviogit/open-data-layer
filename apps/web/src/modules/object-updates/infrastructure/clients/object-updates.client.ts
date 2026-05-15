import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';

import type { ObjectUpdatesFeedPageView } from '../../application/dto/object-updates-feed.dto';

export type FetchObjectUpdatesFeedParams = {
  objectId: string;
  /** Request locale (UI / resolver), sent as `X-Locale`. */
  locale: string;
  viewer?: string | null;
  cursor?: string | null;
  limit?: number;
  update_type?: string;
  /** Filter rows by stored update locale (query param `locale`). */
  updateLocale?: string;
  sort?: 'recency' | 'approval';
};

export async function fetchObjectUpdatesFeed(
  params: FetchObjectUpdatesFeedParams,
): Promise<ObjectUpdatesFeedPageView | null> {
  const id = encodeURIComponent(params.objectId);
  const search = new URLSearchParams();

  if (params.cursor != null && params.cursor.trim() !== '') {
    search.set('cursor', params.cursor);
  }
  if (params.limit != null) {
    search.set('limit', String(params.limit));
  }
  if (params.update_type != null && params.update_type.trim() !== '') {
    search.set('update_type', params.update_type.trim());
  }
  if (params.updateLocale != null && params.updateLocale.trim() !== '') {
    search.set('locale', params.updateLocale.trim());
  }
  if (params.sort != null) {
    search.set('sort', params.sort);
  }

  const qs = search.toString();
  const path = `/query/v1/objects/${id}/updates${qs.length > 0 ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Locale': params.locale,
    'Accept-Language': params.locale,
  };
  if (params.viewer != null && params.viewer.trim() !== '') {
    headers['X-Viewer'] = params.viewer.trim();
  }

  return queryApiFetch<ObjectUpdatesFeedPageView>(path, { headers });
}
