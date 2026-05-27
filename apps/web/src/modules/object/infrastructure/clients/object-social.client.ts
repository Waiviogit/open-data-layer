import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';
import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

import type {
  PaginatedUserFollowListView,
  UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';

/** Right-rail followers preview fetch size — one extra row to detect `hasMore` when count > 5. */
export const RIGHT_RAIL_FOLLOWERS_FETCH_LIMIT = 6;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) {
      continue;
    }
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export async function fetchObjectFollowers(
  objectId: string,
  args: { sort: UserSubscriptionSort; skip: number; limit: number },
  init?: { viewer?: string | null },
): Promise<PaginatedUserFollowListView | null> {
  const qs = buildQuery({ sort: args.sort, skip: args.skip, limit: args.limit });
  const path = `/query/v1/objects/${encodeURIComponent(objectId)}/followers${qs}`;
  const headers: Record<string, string> = {};
  const viewer = init?.viewer?.trim();
  if (viewer) {
    headers['X-Viewer'] = viewer;
  }
  return queryApiFetch<PaginatedUserFollowListView>(path, {
    headers,
    cacheTags: [queryApiCacheTags.objectFollowers(objectId)],
  });
}
