import {
  paginatedUserFollowListSchema,
  type PaginatedUserFollowListView,
  type UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';

import { fetchObjectFollowers } from '../../infrastructure/clients/object-social.client';

export async function getObjectFollowersPageQuery(
  objectId: string,
  args: { sort: UserSubscriptionSort; skip: number; limit: number },
  viewer?: string | null,
): Promise<PaginatedUserFollowListView> {
  const raw = await fetchObjectFollowers(objectId, args, { viewer });
  if (raw === null) {
    return { items: [], total: 0, hasMore: false };
  }
  const parsed = paginatedUserFollowListSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      '[getObjectFollowersPageQuery] unexpected response shape:',
      parsed.error.flatten(),
    );
    return { items: [], total: 0, hasMore: false };
  }
  return parsed.data;
}
