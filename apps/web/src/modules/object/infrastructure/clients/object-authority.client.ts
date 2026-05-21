import 'server-only';

import { queryApiFetch } from '@/modules/user-profile/infrastructure/clients/query-api.client';
import { queryApiCacheTags } from '@/shared/infrastructure/query/query-api-cache-tags';

import type {
  PaginatedUserFollowListView,
  UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';

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

export async function fetchObjectAuthority(
  objectId: string,
  args: {
    authorityType: 'administrative' | 'ownership';
    sort: UserSubscriptionSort;
    skip: number;
    limit: number;
  },
  init?: { viewer?: string | null },
): Promise<PaginatedUserFollowListView | null> {
  const qs = buildQuery({
    authority_type: args.authorityType,
    sort: args.sort,
    skip: args.skip,
    limit: args.limit,
  });
  const path = `/query/v1/objects/${encodeURIComponent(objectId)}/authority${qs}`;
  const headers: Record<string, string> = {};
  const viewer = init?.viewer?.trim();
  if (viewer) {
    headers['X-Viewer'] = viewer;
  }
  return queryApiFetch<PaginatedUserFollowListView>(path, {
    headers,
    cacheTags: [queryApiCacheTags.objectAuthority(objectId)],
  });
}
