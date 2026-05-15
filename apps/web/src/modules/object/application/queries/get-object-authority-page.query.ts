import {
  paginatedUserFollowListSchema,
  type PaginatedUserFollowListView,
  type UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';

import { fetchObjectAuthority } from '../../infrastructure/clients/object-authority.client';

export async function getObjectAuthorityPageQuery(
  objectId: string,
  args: {
    authorityType: 'administrative' | 'ownership';
    sort: UserSubscriptionSort;
    skip: number;
    limit: number;
  },
  viewer?: string | null,
): Promise<PaginatedUserFollowListView> {
  const raw = await fetchObjectAuthority(objectId, args, { viewer });
  if (raw === null) {
    return { items: [], total: 0, hasMore: false };
  }
  const parsed = paginatedUserFollowListSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      '[getObjectAuthorityPageQuery] unexpected response shape:',
      parsed.error.flatten(),
    );
    return { items: [], total: 0, hasMore: false };
  }
  return parsed.data;
}
