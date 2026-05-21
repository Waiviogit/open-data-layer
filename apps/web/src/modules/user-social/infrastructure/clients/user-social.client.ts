import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';
import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

import type {
  PaginatedFollowingObjectsView,
  PaginatedUserFollowListView,
  UserObjectListSort,
  UserSubscriptionSort,
} from '../../application/dto/user-social.dto';

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

export async function fetchUserFollowers(
  accountName: string,
  args: { sort: UserSubscriptionSort; skip: number; limit: number },
  init?: { viewer?: string | null },
): Promise<PaginatedUserFollowListView | null> {
  const qs = buildQuery({ sort: args.sort, skip: args.skip, limit: args.limit });
  const path = `/query/v1/users/${encodeURIComponent(accountName)}/followers${qs}`;
  const headers: Record<string, string> = {};
  const viewer = init?.viewer?.trim();
  if (viewer) {
    headers['X-Viewer'] = viewer;
  }
  return queryApiFetch<PaginatedUserFollowListView>(path, {
    headers,
    cacheTags: [queryApiCacheTags.userFollowers(accountName)],
  });
}

export async function fetchUserFollowing(
  accountName: string,
  args: { sort: UserSubscriptionSort; skip: number; limit: number },
  init?: { viewer?: string | null },
): Promise<PaginatedUserFollowListView | null> {
  const qs = buildQuery({ sort: args.sort, skip: args.skip, limit: args.limit });
  const path = `/query/v1/users/${encodeURIComponent(accountName)}/following${qs}`;
  const headers: Record<string, string> = {};
  const viewer = init?.viewer?.trim();
  if (viewer) {
    headers['X-Viewer'] = viewer;
  }
  return queryApiFetch<PaginatedUserFollowListView>(path, {
    headers,
    cacheTags: [queryApiCacheTags.userFollowing(accountName)],
  });
}

export async function fetchUserFollowingObjects(
  accountName: string,
  args: { sort: UserObjectListSort; skip: number; limit: number },
  locale: string,
  init?: { viewer?: string | null },
): Promise<PaginatedFollowingObjectsView | null> {
  const qs = buildQuery({ sort: args.sort, skip: args.skip, limit: args.limit });
  const path = `/query/v1/users/${encodeURIComponent(accountName)}/following-objects${qs}`;
  const headers: Record<string, string> = {
    'Accept-Language': locale,
  };
  const viewer = init?.viewer?.trim();
  if (viewer) {
    headers['X-Viewer'] = viewer;
  }
  return queryApiFetch<PaginatedFollowingObjectsView>(path, {
    headers,
    cacheTags: [queryApiCacheTags.userFollowingObjects(accountName)],
  });
}
